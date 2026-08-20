package expo.modules.quickledger

import android.content.Context
import android.net.Uri
import java.io.File
import java.util.UUID

internal data class PendingCapture(
  val uri: String,
  val width: Int,
  val height: Int
)

internal object PendingCaptureStore {
  private const val PreferencesName = "expo.quickledger.pending-capture"
  private const val TokenKey = "token"
  private const val PathKey = "path"
  private const val WidthKey = "width"
  private const val HeightKey = "height"
  private const val CreatedAtKey = "createdAt"
  private const val MaxPendingAgeMs = 5L * 60L * 1000L
  private const val MaxCaptureBytes = 50L * 1024L * 1024L
  const val CaptureDirectoryName = "quick-ledger-captures"

  @Synchronized
  fun issue(context: Context, file: File, width: Int, height: Int): String {
    val captureFile = validatedCaptureFile(context, file) ?: throw SecurityException("Invalid capture path")
    val preferences = context.getSharedPreferences(PreferencesName, Context.MODE_PRIVATE)
    val previousPath = preferences.getString(PathKey, null)
    if (previousPath != null && previousPath != captureFile.absolutePath) {
      validatedCaptureFile(context, File(previousPath))?.delete()
    }
    val token = UUID.randomUUID().toString()
    check(preferences.edit()
      .putString(TokenKey, token)
      .putString(PathKey, captureFile.absolutePath)
      .putInt(WidthKey, width)
      .putInt(HeightKey, height)
      .putLong(CreatedAtKey, System.currentTimeMillis())
      .commit()) { "Unable to persist capture token" }
    return token
  }

  @Synchronized
  fun consume(context: Context, token: String): PendingCapture? {
    val preferences = context.getSharedPreferences(PreferencesName, Context.MODE_PRIVATE)
    if (token.isBlank() || preferences.getString(TokenKey, null) != token) return null

    val path = preferences.getString(PathKey, null)
    val width = preferences.getInt(WidthKey, 0)
    val height = preferences.getInt(HeightKey, 0)
    val createdAt = preferences.getLong(CreatedAtKey, 0L)
    preferences.edit().clear().commit()

    if (path == null || width <= 0 || height <= 0) return null
    if (System.currentTimeMillis() - createdAt !in 0..MaxPendingAgeMs) return null
    val file = validatedCaptureFile(context, File(path)) ?: return null
    if (!file.isFile || file.length() <= 0L || file.length() > MaxCaptureBytes) return null
    return PendingCapture(Uri.fromFile(file).toString(), width, height)
  }

  private fun validatedCaptureFile(context: Context, file: File): File? = try {
    val directory = File(context.cacheDir, CaptureDirectoryName).canonicalFile
    val candidate = file.canonicalFile
    if (candidate.parentFile == directory) candidate else null
  } catch (_: Throwable) {
    null
  }
}
