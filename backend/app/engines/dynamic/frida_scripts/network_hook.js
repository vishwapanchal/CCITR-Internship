/**
 * APEX-X Frida Hook: Network Activity
 * Hooks network-related APIs to capture:
 * - HTTP/HTTPS connections (URL.openConnection, HttpURLConnection)
 * - OkHttp3 requests
 * - DNS lookups (InetAddress.getByName)
 * - Socket connections
 * - WebView URL loading
 */

'use strict';

Java.perform(function () {

    // ── Hook URL.openConnection ─────────────────────────────
    try {
        var URL = Java.use('java.net.URL');

        URL.openConnection.overload().implementation = function () {
            var urlStr = this.toString();
            send({
                hook: 'network',
                event: 'url_open_connection',
                url: urlStr,
                protocol: this.getProtocol(),
                host: this.getHost(),
                port: this.getPort(),
                path: this.getPath(),
                timestamp: new Date().toISOString()
            });
            return this.openConnection();
        };
    } catch (e) {
        send({ hook: 'network', event: 'hook_error', error: 'URL.openConnection: ' + e.message });
    }

    // ── Hook HttpURLConnection methods ──────────────────────
    try {
        var HttpURLConnection = Java.use('java.net.HttpURLConnection');

        HttpURLConnection.setRequestMethod.implementation = function (method) {
            send({
                hook: 'network',
                event: 'http_request_method',
                method: method,
                url: this.getURL().toString(),
                timestamp: new Date().toISOString()
            });
            return this.setRequestMethod(method);
        };

        HttpURLConnection.getResponseCode.implementation = function () {
            var code = this.getResponseCode();
            send({
                hook: 'network',
                event: 'http_response',
                url: this.getURL().toString(),
                response_code: code,
                timestamp: new Date().toISOString()
            });
            return code;
        };
    } catch (e) {
        send({ hook: 'network', event: 'hook_error', error: 'HttpURLConnection: ' + e.message });
    }

    // ── Hook OkHttp3 (widely used HTTP client) ──────────────
    try {
        var OkHttpClient = Java.use('okhttp3.OkHttpClient');
        var Call = Java.use('okhttp3.Call');
        var RealCall = Java.use('okhttp3.internal.connection.RealCall');

        RealCall.execute.implementation = function () {
            var request = this.request();
            send({
                hook: 'network',
                event: 'okhttp_request',
                url: request.url().toString(),
                method: request.method(),
                timestamp: new Date().toISOString()
            });
            return this.execute();
        };
    } catch (e) {
        // OkHttp3 may not be present in every app
    }

    // Try alternative OkHttp3 path
    try {
        var RealCall2 = Java.use('okhttp3.RealCall');
        RealCall2.execute.implementation = function () {
            var request = this.request();
            send({
                hook: 'network',
                event: 'okhttp_request',
                url: request.url().toString(),
                method: request.method(),
                timestamp: new Date().toISOString()
            });
            return this.execute();
        };
    } catch (e) {
        // Alternate class structure
    }

    // ── Hook DNS Lookups ────────────────────────────────────
    try {
        var InetAddress = Java.use('java.net.InetAddress');

        InetAddress.getByName.overload('java.lang.String').implementation = function (host) {
            var result = this.getByName(host);
            send({
                hook: 'network',
                event: 'dns_lookup',
                hostname: host,
                resolved_ip: result ? result.getHostAddress() : null,
                timestamp: new Date().toISOString()
            });
            return result;
        };

        InetAddress.getAllByName.overload('java.lang.String').implementation = function (host) {
            var results = this.getAllByName(host);
            var ips = [];
            if (results) {
                for (var i = 0; i < results.length; i++) {
                    ips.push(results[i].getHostAddress());
                }
            }
            send({
                hook: 'network',
                event: 'dns_lookup_all',
                hostname: host,
                resolved_ips: ips,
                timestamp: new Date().toISOString()
            });
            return results;
        };
    } catch (e) {
        send({ hook: 'network', event: 'hook_error', error: 'InetAddress: ' + e.message });
    }

    // ── Hook Socket Connections ──────────────────────────────
    try {
        var Socket = Java.use('java.net.Socket');

        Socket.$init.overload('java.lang.String', 'int').implementation = function (host, port) {
            send({
                hook: 'network',
                event: 'socket_connect',
                host: host,
                port: port,
                timestamp: new Date().toISOString()
            });
            return this.$init(host, port);
        };

        Socket.$init.overload('java.net.InetAddress', 'int').implementation = function (addr, port) {
            send({
                hook: 'network',
                event: 'socket_connect',
                host: addr ? addr.getHostAddress() : null,
                port: port,
                timestamp: new Date().toISOString()
            });
            return this.$init(addr, port);
        };
    } catch (e) {
        send({ hook: 'network', event: 'hook_error', error: 'Socket: ' + e.message });
    }

    // ── Hook WebView URL Loading ────────────────────────────
    try {
        var WebView = Java.use('android.webkit.WebView');

        WebView.loadUrl.overload('java.lang.String').implementation = function (url) {
            send({
                hook: 'network',
                event: 'webview_load_url',
                url: url,
                timestamp: new Date().toISOString()
            });
            return this.loadUrl(url);
        };

        WebView.loadUrl.overload('java.lang.String', 'java.util.Map').implementation = function (url, headers) {
            send({
                hook: 'network',
                event: 'webview_load_url',
                url: url,
                has_headers: headers !== null,
                timestamp: new Date().toISOString()
            });
            return this.loadUrl(url, headers);
        };

        WebView.addJavascriptInterface.implementation = function (obj, name) {
            send({
                hook: 'network',
                event: 'webview_js_interface',
                interface_name: name,
                object_class: obj ? obj.getClass().getName() : null,
                timestamp: new Date().toISOString()
            });
            return this.addJavascriptInterface(obj, name);
        };
    } catch (e) {
        send({ hook: 'network', event: 'hook_error', error: 'WebView: ' + e.message });
    }

    send({ hook: 'network', event: 'hooks_loaded', timestamp: new Date().toISOString() });
});
