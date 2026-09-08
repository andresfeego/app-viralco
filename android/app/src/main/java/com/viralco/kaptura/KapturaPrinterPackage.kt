package com.viralco.kaptura

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class KapturaPrinterPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == KapturaPrinterModule.NAME) KapturaPrinterModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(KapturaPrinterModule.NAME to ReactModuleInfo(KapturaPrinterModule.NAME, KapturaPrinterModule.NAME, false, false, false, true))
  }
}
