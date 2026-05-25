package com.abcinversiones.app

import android.graphics.Color
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT))
    super.onCreate(savedInstanceState)

    WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

    val builder = android.os.StrictMode.VmPolicy.Builder()
    android.os.StrictMode.setVmPolicy(builder.build())
  }
}
