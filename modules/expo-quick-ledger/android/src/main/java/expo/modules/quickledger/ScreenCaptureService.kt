package expo.modules.quickledger

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.view.WindowManager
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicBoolean

class ScreenCaptureService : Service() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val workerThread = HandlerThread("QuickLedgerCapture").apply { start() }
  private val workerHandler = Handler(workerThread.looper)
  private val completed = AtomicBoolean(false)
  private var mediaProjection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null

  private val projectionCallback = object : MediaProjection.Callback() {
    override fun onStop() {
      if (!completed.get()) finishWithError("系统已停止截屏")
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startCaptureForeground()
    val resultCode = intent?.getIntExtra(CaptureContract.EXTRA_RESULT_CODE, ActivityResultCodeMissing) ?: ActivityResultCodeMissing
    val resultData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent?.getParcelableExtra(CaptureContract.EXTRA_RESULT_DATA, Intent::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent?.getParcelableExtra(CaptureContract.EXTRA_RESULT_DATA)
    }
    if (resultCode == ActivityResultCodeMissing || resultCode != android.app.Activity.RESULT_OK || resultData == null) {
      finishWithError("没有获得系统截屏授权")
      return START_NOT_STICKY
    }

    mainHandler.postDelayed({ startProjection(resultCode, resultData) }, 350)
    mainHandler.postDelayed({ finishWithError("截屏超时，请重试") }, 10_000)
    return START_NOT_STICKY
  }

  private fun startProjection(resultCode: Int, resultData: Intent) {
    if (completed.get()) return
    try {
      val manager = getSystemService(MediaProjectionManager::class.java)
      val projection = manager.getMediaProjection(resultCode, resultData)
      mediaProjection = projection
      projection!!.registerCallback(projectionCallback, mainHandler)

      val metrics = screenMetrics()
      val reader = ImageReader.newInstance(metrics.widthPixels, metrics.heightPixels, PixelFormat.RGBA_8888, 2)
      imageReader = reader
      reader.setOnImageAvailableListener({ source ->
        val image = source.acquireLatestImage() ?: return@setOnImageAvailableListener
        if (!completed.compareAndSet(false, true)) {
          image.close()
          return@setOnImageAvailableListener
        }
        try {
          val output = saveImage(image, metrics.widthPixels, metrics.heightPixels)
          notifyCaptureFinished(output, metrics.widthPixels, metrics.heightPixels)
        } catch (_: Throwable) {
          notifyCaptureFailed("无法保存截屏，请重试")
        } finally {
          image.close()
          cleanup()
        }
      }, workerHandler)

      virtualDisplay = projection!!.createVirtualDisplay(
        "QuickLedgerCapture",
        metrics.widthPixels,
        metrics.heightPixels,
        metrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        reader.surface,
        null,
        workerHandler
      )
    } catch (_: Throwable) {
      finishWithError("无法启动系统截屏，请重试")
    }
  }

  private fun screenMetrics(): DisplayMetrics {
    val metrics = DisplayMetrics()
    val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val bounds = windowManager.maximumWindowMetrics.bounds
      metrics.widthPixels = bounds.width()
      metrics.heightPixels = bounds.height()
      metrics.densityDpi = resources.displayMetrics.densityDpi
    } else {
      @Suppress("DEPRECATION")
      windowManager.defaultDisplay.getRealMetrics(metrics)
    }
    return metrics
  }

  private fun saveImage(image: Image, width: Int, height: Int): File {
    val plane = image.planes.first()
    val rowPadding = plane.rowStride - plane.pixelStride * width
    val paddedWidth = width + rowPadding / plane.pixelStride
    val paddedBitmap = Bitmap.createBitmap(paddedWidth, height, Bitmap.Config.ARGB_8888)
    paddedBitmap.copyPixelsFromBuffer(plane.buffer)
    val croppedBitmap = Bitmap.createBitmap(paddedBitmap, 0, 0, width, height)

    val captureDirectory = File(cacheDir, PendingCaptureStore.CaptureDirectoryName).apply { mkdirs() }
    captureDirectory.listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > CaptureMaxAgeMs }?.forEach { it.delete() }
    val output = File(captureDirectory, "ai-ledger-${System.currentTimeMillis()}.png")
    FileOutputStream(output).use { stream ->
      if (!croppedBitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) {
        throw IllegalStateException("Bitmap compression failed")
      }
    }
    croppedBitmap.recycle()
    paddedBitmap.recycle()
    return output
  }

  private fun notifyCaptureFinished(file: File, width: Int, height: Int) {
    val token = PendingCaptureStore.issue(this, file, width, height)
    sendBroadcast(Intent(CaptureContract.ACTION_CAPTURE_FINISHED).apply {
      setPackage(packageName)
      putExtra(CaptureContract.EXTRA_CAPTURE_TOKEN, token)
    })
  }

  private fun finishWithError(message: String) {
    if (!completed.compareAndSet(false, true)) return
    notifyCaptureFailed(message)
    cleanup()
  }

  private fun notifyCaptureFailed(message: String) {
    sendBroadcast(Intent(CaptureContract.ACTION_CAPTURE_FINISHED).apply {
      setPackage(packageName)
      putExtra(CaptureContract.EXTRA_ERROR, message)
    })
  }

  private fun startCaptureForeground() {
    val notificationManager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      notificationManager.createNotificationChannel(
        NotificationChannel(NotificationChannelId, getString(R.string.quick_ledger_capture_channel), NotificationManager.IMPORTANCE_LOW)
      )
    }
    val notificationBuilder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, NotificationChannelId)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    val notification = notificationBuilder
      .setSmallIcon(R.drawable.ic_quick_ledger_tile)
      .setContentTitle(getString(R.string.quick_ledger_capture_channel))
      .setContentText(getString(R.string.quick_ledger_capture_notification))
      .setCategory(Notification.CATEGORY_SERVICE)
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NotificationId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
    } else {
      startForeground(NotificationId, notification)
    }
  }

  private fun cleanup() {
    mainHandler.removeCallbacksAndMessages(null)
    imageReader?.setOnImageAvailableListener(null, null)
    virtualDisplay?.release()
    imageReader?.close()
    mediaProjection?.unregisterCallback(projectionCallback)
    mediaProjection?.stop()
    virtualDisplay = null
    imageReader = null
    mediaProjection = null
    workerThread.quitSafely()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE) else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  override fun onDestroy() {
    if (!completed.get()) finishWithError("截屏服务已停止")
    super.onDestroy()
  }

  private companion object {
    const val ActivityResultCodeMissing = Int.MIN_VALUE
    const val NotificationChannelId = "quick-ledger-capture"
    const val NotificationId = 7301
    const val CaptureMaxAgeMs = 24L * 60L * 60L * 1000L
  }
}
