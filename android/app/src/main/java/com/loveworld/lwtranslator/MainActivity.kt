package com.loveworld.lwtranslator

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Native Android shell (Phase 5).
 *
 * It does not reimplement the UI: it loads the LW Translator PWA served by the
 * local venue server and supplies the native capabilities a WebView cannot
 * provide on its own — microphone permission, WebRTC media grants, audio focus
 * and Bluetooth routing, LAN discovery and screen-awake handling.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var audio: AudioSessionController
    private lateinit var discovery: ServerDiscovery

    private var pendingWebPermission: PermissionRequest? = null

    private val micPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingWebPermission
            pendingWebPermission = null
            if (granted) {
                request?.grant(request.resources)
                audio.startCapture()
            } else {
                request?.deny()
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        audio = AudioSessionController(this)
        discovery = ServerDiscovery(this, BuildConfig.SERVER_PORT)
        discovery.start()

        webView = WebView(this)
        setContentView(webView)

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        // Exposes window.LWNative to the PWA (server host, audio, keep-awake).
        webView.addJavascriptInterface(NativeBridge(this, audio, discovery), "LWNativeAndroid")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val wantsAudio = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (!wantsAudio) {
                    request.deny()
                    return
                }
                val granted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.RECORD_AUDIO,
                ) == PackageManager.PERMISSION_GRANTED
                if (granted) {
                    request.grant(request.resources)
                    audio.startCapture()
                } else {
                    pendingWebPermission = request
                    micPermission.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                view.evaluateJavascript(NativeBridge.INSTALL_SCRIPT, null)
            }

            // The venue server uses its own certificate; trust it only on the local network.
            override fun onReceivedSslError(
                view: WebView,
                handler: android.webkit.SslErrorHandler,
                error: android.net.http.SslError,
            ) {
                val host = Uri.parse(error.url).host ?: ""
                val local = host.endsWith(".local") || host == "localhost" ||
                    Regex("""^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\..*""").matches(host)
                if (local) handler.proceed() else handler.cancel()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val host = request.url.host ?: return false
                // Keep venue traffic inside the shell; anything else goes to the browser.
                if (host.endsWith(".local") || host.matches(Regex("""\d+\.\d+\.\d+\.\d+""")) ||
                    host == "localhost"
                ) {
                    return false
                }
                startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, request.url))
                return true
            }
        }

        webView.loadUrl(discovery.appUrl() ?: BuildConfig.DEFAULT_APP_URL)
        keepScreenAwake(true)
        hideSystemBars()
    }

    fun reload(url: String? = null) {
        runOnUiThread {
            if (url != null) webView.loadUrl(url) else webView.reload()
        }
    }

    fun openExternally(url: String) {
        startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url)))
    }

    fun keepScreenAwake(enabled: Boolean) {
        runOnUiThread {
            if (enabled) {
                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    private fun hideSystemBars() {
        @Suppress("DEPRECATION")
        webView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    }

    override fun onResume() {
        super.onResume()
        discovery.start()
    }

    override fun onPause() {
        super.onPause()
        // Audio keeps running via the foreground service so translation is not cut
        // off when the phone screen turns off or the user switches apps.
    }

    override fun onDestroy() {
        discovery.stop()
        audio.release()
        webView.destroy()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
