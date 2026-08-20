package expo.modules.quickledger

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.media.projection.MediaProjectionConfig
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.core.content.ContextCompat

class CapturePermissionActivity : Activity() {
  private val timeoutHandler = Handler(Looper.getMainLooper())
  private var receiverRegistered = false

  private val captureReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != CaptureContract.ACTION_CAPTURE_FINISHED) return
      val captureToken = intent.getStringExtra(CaptureContract.EXTRA_CAPTURE_TOKEN)
      if (captureToken == null) {
        val message = intent.getStringExtra(CaptureContract.EXTRA_ERROR) ?: "截屏失败，请重试"
        Toast.makeText(this@CapturePermissionActivity, message, Toast.LENGTH_LONG).show()
        finishCaptureActivity()
        return
      }

      val deepLink = Uri.Builder()
        .scheme(CaptureContract.APP_SCHEME)
        .authority("transactions")
        .appendQueryParameter("quickCaptureToken", captureToken)
        .build()
      val openApp = Intent(Intent.ACTION_VIEW, deepLink).apply {
        setPackage(packageName)
        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      startActivity(openApp)
      finishCaptureActivity()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    registerCaptureReceiver()

    if (savedInstanceState == null) {
      val projectionManager = getSystemService(MediaProjectionManager::class.java)
      val captureIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        projectionManager.createScreenCaptureIntent(MediaProjectionConfig.createConfigForDefaultDisplay())
      } else {
        projectionManager.createScreenCaptureIntent()
      }
      @Suppress("DEPRECATION")
      startActivityForResult(
        captureIntent,
        CaptureContract.REQUEST_MEDIA_PROJECTION
      )
    }
  }

  @Deprecated("Kept for MediaProjection's system consent activity")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode != CaptureContract.REQUEST_MEDIA_PROJECTION) return
    if (resultCode != RESULT_OK || data == null) {
      finishCaptureActivity()
      return
    }

    val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
      putExtra(CaptureContract.EXTRA_RESULT_CODE, resultCode)
      putExtra(CaptureContract.EXTRA_RESULT_DATA, data)
    }
    ContextCompat.startForegroundService(this, serviceIntent)
    timeoutHandler.postDelayed({
      Toast.makeText(this, "截屏超时，请重试", Toast.LENGTH_LONG).show()
      finishCaptureActivity()
    }, 15_000)
  }

  private fun registerCaptureReceiver() {
    val filter = IntentFilter(CaptureContract.ACTION_CAPTURE_FINISHED)
    ContextCompat.registerReceiver(this, captureReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    receiverRegistered = true
  }

  private fun finishCaptureActivity() {
    timeoutHandler.removeCallbacksAndMessages(null)
    if (receiverRegistered) {
      unregisterReceiver(captureReceiver)
      receiverRegistered = false
    }
    finish()
    overridePendingTransition(0, 0)
  }

  override fun onDestroy() {
    timeoutHandler.removeCallbacksAndMessages(null)
    if (receiverRegistered) {
      unregisterReceiver(captureReceiver)
      receiverRegistered = false
    }
    super.onDestroy()
  }
}
