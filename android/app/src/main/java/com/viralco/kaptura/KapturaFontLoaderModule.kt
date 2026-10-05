package com.viralco.kaptura

import android.graphics.Typeface
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.assets.ReactFontManager
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class KapturaFontLoaderModule(reactContext: ReactApplicationContext) : NativeKapturaFontLoaderSpec(reactContext) {
  private val executor = Executors.newSingleThreadExecutor()

  override fun getName() = NAME

  override fun loadFont(fontId: String, sourceUrl: String, promise: Promise) {
    executor.execute {
      try {
        val safeId = fontId.replace(Regex("[^A-Za-z0-9_-]"), "_")
        val familyName = "KapturaFont_$safeId"
        val directory = File(reactApplicationContext.cacheDir, "kaptura-fonts").apply { mkdirs() }
        val target = File(directory, "$safeId.font")
        if (!target.exists() || target.length() == 0L) download(sourceUrl, target)
        val typeface = Typeface.createFromFile(target)
        ReactFontManager.getInstance().addCustomFont(familyName, typeface)
        promise.resolve(familyName)
      } catch (error: Exception) {
        promise.reject("RUNTIME_FONT_LOAD_FAILED", "No se pudo cargar la fuente", error)
      }
    }
  }

  private fun download(sourceUrl: String, target: File) {
    val temporary = File(target.parentFile, "${target.name}.download")
    val source = URL(sourceUrl)
    if (source.protocol == "file") {
      val local = File(source.toURI()).canonicalFile
      val roots = listOf(reactApplicationContext.cacheDir, reactApplicationContext.filesDir)
      require(roots.any { local.path.startsWith(it.canonicalPath + File.separator) }) { "Font outside private app storage" }
      local.copyTo(temporary, overwrite = true)
      if (!temporary.renameTo(target)) {
        temporary.copyTo(target, overwrite = true)
        temporary.delete()
      }
      return
    }
    val connection = source.openConnection() as HttpURLConnection
    connection.connectTimeout = 15000
    connection.readTimeout = 30000
    connection.instanceFollowRedirects = true
    try {
      connection.connect()
      if (connection.responseCode !in 200..299) throw IllegalStateException("HTTP ${connection.responseCode}")
      connection.inputStream.use { input -> temporary.outputStream().use { output -> input.copyTo(output) } }
      if (!temporary.renameTo(target)) {
        temporary.copyTo(target, overwrite = true)
        temporary.delete()
      }
    } finally {
      connection.disconnect()
    }
  }

  companion object {
    const val NAME = "NativeKapturaFontLoader"
  }
}
