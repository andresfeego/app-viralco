package com.viralco.kaptura

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class KapturaPrinterModule(reactContext: ReactApplicationContext) : NativeKapturaPrinterSpec(reactContext) {
  override fun getName() = NAME

  override fun pickPrinter(promise: Promise) {
    promise.reject("PRINTER_PICKER_UNAVAILABLE", "La deteccion directa de impresoras no esta disponible en Android")
  }

  companion object {
    const val NAME = "NativeKapturaPrinter"
  }
}
