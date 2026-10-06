package com.viralco.kaptura

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.io.File
import java.util.concurrent.Executors
import kotlin.math.*

class KapturaDocumentsModule(context: ReactApplicationContext) : NativeKapturaDocumentsSpec(context) {
  private val worker = Executors.newSingleThreadExecutor()
  override fun getName() = NAME
  override fun renderPdfPage(path: String, page: Double, promise: Promise) {
    worker.execute {
      try {
        val root = File(reactApplicationContext.cacheDir, "kaptura-private-receipts").canonicalPath + File.separator
        val file = File(path).canonicalFile
        require(file.path.startsWith(root) && file.name == "receipt.pdf" && file.isFile && page.isFinite() && page >= 0 && floor(page) == page)
        ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
          PdfRenderer(descriptor).use { renderer ->
            require(page < renderer.pageCount)
            renderer.openPage(page.toInt()).use { pdf ->
              require(pdf.width > 0 && pdf.height > 0)
              val factor = 3072.0 / max(pdf.width, pdf.height)
              val width = max(1, ceil(pdf.width * factor).toInt())
              val height = max(1, ceil(pdf.height * factor).toInt())
              val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
              try {
                bitmap.eraseColor(Color.WHITE)
                pdf.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                val output = File(file.parentFile, "page-${page.toInt()}.png")
                output.outputStream().use { require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) }
                promise.resolve(Arguments.createMap().apply {
                  putString("uri", Uri.fromFile(output).toString())
                  putDouble("width", width.toDouble()); putDouble("height", height.toDouble())
                  putDouble("pageCount", renderer.pageCount.toDouble())
                })
              } finally { bitmap.recycle() }
            }
          }
        }
      } catch (error: Exception) { promise.reject("DOCUMENT_RENDER_FAILED", "DOCUMENT_RENDER_FAILED", error) }
    }
  }
  override fun invalidate() { worker.shutdown(); super.invalidate() }
  companion object { const val NAME = "NativeKapturaDocuments" }
}
