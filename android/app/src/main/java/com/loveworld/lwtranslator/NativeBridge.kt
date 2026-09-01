package com.loveworld.lwtranslator

import android.webkit.JavascriptInterface

/**
 * JS bridge exposed to the PWA as `window.LWNativeAndroid` and wrapped into the
 * `window.LWNative` contract the web app already looks for (see
 * `src/services/native/NativeBridge.ts` and `DiscoveryService`).
 */
class NativeBridge(
    private val activity: MainActivity,
    private val audio: AudioSessionController,
    private val discovery: ServerDiscovery,
) {

    @JavascriptInterface
    fun getServerHost(): String? = discovery.serverHost()

    @JavascriptInterface
    fun getPlatform(): String = "android"

    /** Starts the foreground audio session (audio focus + Bluetooth routing). */
    @JavascriptInterface
    fun startAudioSession(role: String) = audio.start(role)

    @JavascriptInterface
    fun stopAudioSession() = audio.stop()

    @JavascriptInterface
    fun setSpeakerphone(enabled: Boolean) = audio.setSpeakerphone(enabled)

    /** True when a wired or Bluetooth headset is connected. */
    @JavascriptInterface
    fun hasHeadset(): Boolean = audio.hasHeadset()

    @JavascriptInterface
    fun keepAwake(enabled: Boolean) = activity.keepScreenAwake(enabled)

    @JavascriptInterface
    fun reload(url: String?) = activity.reload(url?.takeIf { it.isNotBlank() })

    @JavascriptInterface
    fun openExternally(url: String) = activity.openExternally(url)

    companion object {
        /**
         * Installed on every page load so the PWA sees a stable `window.LWNative`
         * regardless of shell version.
         */
        const val INSTALL_SCRIPT: String = """
            (function () {
              var native = window.LWNativeAndroid;
              if (!native) return;
              window.LWNative = {
                platform: 'android',
                getServerHost: function () { try { return native.getServerHost(); } catch (e) { return null; } },
                startAudioSession: function (role) { native.startAudioSession(role || 'listener'); },
                stopAudioSession: function () { native.stopAudioSession(); },
                setSpeakerphone: function (on) { native.setSpeakerphone(!!on); },
                hasHeadset: function () { try { return native.hasHeadset(); } catch (e) { return false; } },
                keepAwake: function (on) { native.keepAwake(!!on); },
                reload: function (url) { native.reload(url || ''); },
                openExternally: function (url) { native.openExternally(url); }
              };
              window.dispatchEvent(new Event('lw-native-ready'));
            })();
        """
    }
}
