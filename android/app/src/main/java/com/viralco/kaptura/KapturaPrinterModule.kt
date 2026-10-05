package com.viralco.kaptura

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import android.graphics.*
import android.os.*
import android.print.*
import android.print.pdf.PrintedPdfDocument
import com.facebook.react.bridge.UiThreadUtil
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.*

class KapturaPrinterModule(reactContext: ReactApplicationContext) : NativeKapturaPrinterSpec(reactContext) {
  private val busy = AtomicBoolean(false)
  private val worker = Executors.newSingleThreadExecutor()
  override fun getName() = NAME

  override fun openManual(path: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val activity = reactApplicationContext.currentActivity ?: throw IllegalStateException("MANUAL_UNAVAILABLE")
        val root = File(reactApplicationContext.filesDir, "kaptura-print-manuals").canonicalPath + File.separator
        val file = File(path).canonicalFile
        require(file.path.startsWith(root) && file.extension == "pdf" && file.isFile)
        val uri = FileProvider.getUriForFile(activity, activity.packageName + ".manuals", file)
        activity.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        promise.resolve(true)
      } catch (error: Exception) { promise.reject("MANUAL_UNAVAILABLE", error) }
    }
  }

  override fun pickPrinter(promise: Promise) {
    promise.reject("PRINTER_PICKER_UNAVAILABLE", "La deteccion directa de impresoras no esta disponible en Android")
  }

  override fun printDocument(jobJson: String, promise: Promise) {
    if (!busy.compareAndSet(false, true)) { promise.reject("PRINT_BUSY", "PRINT_BUSY"); return }
    try {
      val data = JSONObject(jobJson)
      val options = data.getJSONObject("options")
      val items = data.getJSONArray("items")
      val width = options.getDouble("widthMm")
      val height = options.getDouble("heightMm")
      val margin = options.getDouble("marginMm")
      val copies = options.getInt("copies")
      val dpi = options.getInt("dpi")
      require(width.isFinite() && height.isFinite() && margin.isFinite() && width in 20.0..2000.0 && height in 20.0..2000.0 && margin >= 0 && margin < min(width,height)/2)
      require(copies in 1..100 && dpi in 72..1200 && items.length() in 1..500 && items.length()*copies<=500)
      require(options.getString("fit") in listOf("contain","cover") && options.getString("colorMode") in listOf("color","grayscale"))
      val root = File(reactApplicationContext.applicationInfo.dataDir).canonicalPath + File.separator
      val sources = (0 until items.length()).map { index ->
        File(items.getJSONObject(index).getString("path")).canonicalFile.also { require(it.path.startsWith(root) && it.isFile) }
      }
      UiThreadUtil.runOnUiThread {
        val activity = reactApplicationContext.currentActivity
        if (activity == null || activity.isFinishing) { busy.set(false); promise.reject("PRINT_NOT_ACTIVE", "PRINT_NOT_ACTIVE"); return@runOnUiThread }
        val manager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
        val pageCount = sources.size * copies
        var printJob: PrintJob? = null
        val finished = AtomicBoolean(false)
        val attributes = PrintAttributes.Builder()
          .setMediaSize(PrintAttributes.MediaSize("KAPTURA", "Kaptura", (width / 25.4 * 1000).roundToInt(), (height / 25.4 * 1000).roundToInt()))
          .setResolution(PrintAttributes.Resolution("KAPTURA", "Kaptura", dpi, dpi))
          .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
          .setColorMode(if (options.getString("colorMode") == "grayscale") PrintAttributes.COLOR_MODE_MONOCHROME else PrintAttributes.COLOR_MODE_COLOR)
          .setDuplexMode(PrintAttributes.DUPLEX_MODE_NONE).build()
        val adapter = object : PrintDocumentAdapter() {
          private var currentAttributes = attributes
          override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes, cancellation: CancellationSignal, callback: LayoutResultCallback, extras: Bundle?) {
            if (cancellation.isCanceled) { callback.onLayoutCancelled(); return }
            currentAttributes = newAttributes
            callback.onLayoutFinished(PrintDocumentInfo.Builder("kaptura.pdf").setContentType(PrintDocumentInfo.CONTENT_TYPE_PHOTO).setPageCount(pageCount).build(), oldAttributes != newAttributes)
          }
          override fun onWrite(ranges: Array<out PageRange>, destination: ParcelFileDescriptor, cancellation: CancellationSignal, callback: WriteResultCallback) {
            val selectedAttributes = currentAttributes
            worker.execute {
              var document: PrintedPdfDocument? = null
              try {
                if (cancellation.isCanceled || finished.get()) { callback.onWriteCancelled(); return@execute }
                document = PrintedPdfDocument(activity, selectedAttributes)
                val written = mutableListOf<PageRange>()
                sources.forEachIndexed { sourceIndex, source ->
                  if (cancellation.isCanceled || finished.get()) throw InterruptedException()
                  val indices = (0 until copies).map { sourceIndex*copies+it }.filter { p -> ranges.any { p >= it.start && p <= it.end } }
                  if (indices.isNotEmpty()) {
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(source.path, bounds)
                    require(bounds.outWidth > 0 && bounds.outHeight > 0)
                    val maxPixels = max(document!!.pageWidth, document!!.pageHeight) * dpi / 72.0
                    var sample = 1
                    while (max(bounds.outWidth,bounds.outHeight)/sample > maxPixels*2) sample *= 2
                    require(bounds.outWidth.toLong()*bounds.outHeight/(sample*sample) <= 40_000_000)
                    val bitmap = BitmapFactory.decodeFile(source.path, BitmapFactory.Options().apply { inSampleSize=sample }) ?: throw IllegalArgumentException("PRINT_FILE_MISSING")
                    try {
                      for (pageIndex in indices) {
                        if (cancellation.isCanceled || finished.get()) throw InterruptedException()
                        val page = document!!.startPage(pageIndex)
                        val canvas = page.canvas
                        canvas.drawColor(Color.WHITE)
                        val m = (margin*72/25.4).toFloat()
                        val content = document!!.pageContentRect
                        val area = RectF(max(m,content.left.toFloat()),max(m,content.top.toFloat()),min(document!!.pageWidth-m,content.right.toFloat()),min(document!!.pageHeight-m,content.bottom.toFloat()))
                        require(area.width()>0 && area.height()>0)
                        val two = options.getBoolean("twoPerPage")
                        val horizontal = area.width() >= area.height()
                        val cellW = area.width() / if (two && horizontal) 2 else 1
                        val cellH = area.height() / if (two && !horizontal) 2 else 1
                        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
                        if (options.getString("colorMode")=="grayscale" || selectedAttributes.colorMode==PrintAttributes.COLOR_MODE_MONOCHROME) paint.colorFilter=ColorMatrixColorFilter(ColorMatrix().apply { setSaturation(0f) })
                        for (n in 0 until if (two) 2 else 1) {
                          val x=area.left + if (horizontal) n*cellW else 0f
                          val y=area.top + if (!horizontal) n*cellH else 0f
                          val sx=cellW/bitmap.width; val sy=cellH/bitmap.height
                          val scale=if (options.getString("fit")=="cover") max(sx,sy) else min(sx,sy)
                          val dw=bitmap.width*scale; val dh=bitmap.height*scale
                          canvas.save(); canvas.clipRect(x,y,x+cellW,y+cellH)
                          canvas.drawBitmap(bitmap,null,RectF(x+(cellW-dw)/2,y+(cellH-dh)/2,x+(cellW+dw)/2,y+(cellH+dh)/2),paint)
                          canvas.restore()
                        }
                        document!!.finishPage(page); written.add(PageRange(pageIndex,pageIndex))
                      }
                    } finally { bitmap.recycle() }
                  }
                }
                if (cancellation.isCanceled || finished.get()) throw InterruptedException()
                FileOutputStream(destination.fileDescriptor).use { document!!.writeTo(it) }
                callback.onWriteFinished(written.toTypedArray())
              } catch (_: InterruptedException) { callback.onWriteCancelled() }
              catch (error: Exception) {
                android.util.Log.e(NAME,"PRINT_WRITE_FAILED",error)
                callback.onWriteFailed(if (java.util.Locale.getDefault().language=="es") "No se pudo preparar la impresión." else "Could not prepare printing.")
              } finally { document?.close() }
            }
          }
          override fun onFinish() {
            finished.set(true)
            // The spooler owns its copied document now; no original or capture is removed.
            Handler(Looper.getMainLooper()).postDelayed({
              val state = printJob?.info?.state
              val status = when (state) {
                PrintJobInfo.STATE_COMPLETED -> "completed"
                PrintJobInfo.STATE_CANCELED -> "cancelled"
                PrintJobInfo.STATE_FAILED -> "failed"
                PrintJobInfo.STATE_QUEUED, PrintJobInfo.STATE_STARTED, PrintJobInfo.STATE_BLOCKED -> "submitted"
                else -> "unknown"
              }
              busy.set(false)
              promise.resolve(JSONObject().put("status",status).put("jobId",printJob?.id?.toString() ?: "").toString())
            }, 300)
          }
        }
        try { printJob=manager.print(data.optString("name","Kaptura"),adapter,attributes) }
        catch (error: Exception) { busy.set(false); promise.reject("PRINT_SEND_FAILED",error) }
      }
    } catch (error: Exception) { busy.set(false); promise.reject("PRINT_SETTINGS_INVALID",error) }
  }

  companion object {
    const val NAME = "NativeKapturaPrinter"
  }
}
