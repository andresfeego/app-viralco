package com.viralco.kaptura

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class KapturaDocumentsPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == KapturaDocumentsModule.NAME) KapturaDocumentsModule(reactContext) else null
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(KapturaDocumentsModule.NAME to ReactModuleInfo(KapturaDocumentsModule.NAME, KapturaDocumentsModule.NAME, false, false, false, true))
  }
}
