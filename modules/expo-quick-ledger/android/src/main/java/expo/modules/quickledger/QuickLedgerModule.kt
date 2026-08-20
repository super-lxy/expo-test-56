package expo.modules.quickledger

import android.app.StatusBarManager
import android.content.ComponentName
import android.graphics.drawable.Icon
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class QuickLedgerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuickLedger")

    Function("getTileSetupMode") {
      when {
        Build.VERSION.SDK_INT < Build.VERSION_CODES.N -> "unsupported"
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU -> "manual"
        else -> "prompt"
      }
    }

    AsyncFunction("requestAddTile") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
        promise.resolve("unsupported")
        return@AsyncFunction
      }
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        promise.resolve("manual")
        return@AsyncFunction
      }
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve("unavailable")
        return@AsyncFunction
      }
      try {
        val statusBarManager = context.getSystemService(StatusBarManager::class.java)
        statusBarManager.requestAddTileService(
          ComponentName(context, QuickLedgerTileService::class.java),
          context.getString(R.string.quick_ledger_tile_label),
          Icon.createWithResource(context, R.drawable.ic_quick_ledger_tile),
          activity.mainExecutor
        ) { result ->
          val mappedResult = when (result) {
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED -> "added"
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED -> "already-added"
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_NOT_ADDED -> "not-added"
            else -> "error"
          }
          promise.resolve(mappedResult)
        }
      } catch (error: Throwable) {
        promise.reject("ERR_QUICK_LEDGER_TILE", "Unable to request the quick settings tile", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("consumePendingCapture") { token: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      PendingCaptureStore.consume(context, token)?.let { capture ->
        mapOf<String, Any>(
          "uri" to capture.uri,
          "width" to capture.width,
          "height" to capture.height
        )
      }
    }
  }
}
