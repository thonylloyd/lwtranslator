package com.loveworld.lwtranslator

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import java.util.concurrent.atomic.AtomicReference

/**
 * Finds the venue server on the private Wi-Fi with Android NSD (mDNS).
 *
 * The Node server advertises `_lwtranslator._tcp` and `lw-translator.local`
 * (see `server/src/mdns.js`). The resolved `host:port` is handed to the PWA
 * through `window.LWNative.getServerHost()`, so the web app never hardcodes
 * an IP address.
 */
class ServerDiscovery(context: Context, private val defaultPort: Int) {

    private val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val resolved = AtomicReference<String?>(null)
    private var listener: NsdManager.DiscoveryListener? = null

    fun serverHost(): String? = resolved.get()

    fun appUrl(): String? = resolved.get()?.let { "http://$it/" }

    fun start() {
        if (listener != null) return
        val discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) = Unit
            override fun onDiscoveryStopped(serviceType: String) = Unit
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) = stop()
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit

            override fun onServiceFound(info: NsdServiceInfo) {
                if (!info.serviceType.contains(SERVICE_TYPE.trimEnd('.'))) return
                resolve(info)
            }

            override fun onServiceLost(info: NsdServiceInfo) {
                resolved.set(null)
            }
        }
        listener = discoveryListener
        runCatching {
            nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        }
    }

    private fun resolve(info: NsdServiceInfo) {
        @Suppress("DEPRECATION")
        nsdManager.resolveService(
            info,
            object : NsdManager.ResolveListener {
                override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) = Unit

                override fun onServiceResolved(info: NsdServiceInfo) {
                    val address = hostAddress(info) ?: return
                    val port = if (info.port > 0) info.port else defaultPort
                    resolved.set("$address:$port")
                }
            },
        )
    }

    private fun hostAddress(info: NsdServiceInfo): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val host = info.hostAddresses.firstOrNull()?.hostAddress
            if (host != null) return host
        }
        @Suppress("DEPRECATION")
        return info.host?.hostAddress
    }

    fun stop() {
        listener?.let { runCatching { nsdManager.stopServiceDiscovery(it) } }
        listener = null
    }

    companion object {
        private const val SERVICE_TYPE = "_lwtranslator._tcp."
    }
}
