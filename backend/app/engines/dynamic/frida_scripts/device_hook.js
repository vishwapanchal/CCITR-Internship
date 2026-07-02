/**
 * APEX-X Frida Hook: Device & Sensitive Data Access
 * Hooks APIs for:
 * - Camera access
 * - Microphone / audio recording
 * - Location services
 * - Contacts / Call log queries
 * - Clipboard access
 * - Device identifiers (IMEI, Android ID)
 * - Package manager (installed apps enumeration)
 */

'use strict';

Java.perform(function () {

    // ── Hook Camera Access ──────────────────────────────────
    try {
        var Camera = Java.use('android.hardware.Camera');

        Camera.open.overload('int').implementation = function (cameraId) {
            send({
                hook: 'device',
                event: 'camera_open',
                camera_id: cameraId,
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.open(cameraId);
        };

        Camera.open.overload().implementation = function () {
            send({
                hook: 'device',
                event: 'camera_open',
                camera_id: 'default',
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.open();
        };
    } catch (e) {
        // Camera class may not be available on all devices
    }

    // CameraManager (newer API)
    try {
        var CameraManager = Java.use('android.hardware.camera2.CameraManager');

        CameraManager.openCamera.overload(
            'java.lang.String', 'android.hardware.camera2.CameraDevice$StateCallback',
            'android.os.Handler'
        ).implementation = function (cameraId, callback, handler) {
            send({
                hook: 'device',
                event: 'camera2_open',
                camera_id: cameraId,
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.openCamera(cameraId, callback, handler);
        };
    } catch (e) {
        // camera2 API hooks
    }

    // ── Hook Audio Recording ────────────────────────────────
    try {
        var MediaRecorder = Java.use('android.media.MediaRecorder');

        MediaRecorder.setAudioSource.implementation = function (audioSource) {
            var sources = { 0: 'DEFAULT', 1: 'MIC', 5: 'CAMCORDER', 7: 'VOICE_COMMUNICATION' };
            send({
                hook: 'device',
                event: 'audio_record_setup',
                source: sources[audioSource] || 'SOURCE_' + audioSource,
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.setAudioSource(audioSource);
        };

        MediaRecorder.start.implementation = function () {
            send({
                hook: 'device',
                event: 'media_recorder_start',
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.start();
        };
    } catch (e) {
        send({ hook: 'device', event: 'hook_error', error: 'MediaRecorder: ' + e.message });
    }

    // AudioRecord (lower-level audio capture)
    try {
        var AudioRecord = Java.use('android.media.AudioRecord');

        AudioRecord.startRecording.implementation = function () {
            send({
                hook: 'device',
                event: 'audio_record_start',
                sample_rate: this.getSampleRate(),
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.startRecording();
        };
    } catch (e) {
        // AudioRecord hooks
    }

    // ── Hook Location Services ──────────────────────────────
    try {
        var LocationManager = Java.use('android.location.LocationManager');

        LocationManager.getLastKnownLocation.implementation = function (provider) {
            var location = this.getLastKnownLocation(provider);
            send({
                hook: 'device',
                event: 'location_get_last',
                provider: provider,
                latitude: location ? location.getLatitude() : null,
                longitude: location ? location.getLongitude() : null,
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return location;
        };

        LocationManager.requestLocationUpdates.overload(
            'java.lang.String', 'long', 'float', 'android.location.LocationListener'
        ).implementation = function (provider, minTime, minDistance, listener) {
            send({
                hook: 'device',
                event: 'location_request_updates',
                provider: provider,
                min_time_ms: minTime,
                min_distance_m: minDistance,
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.requestLocationUpdates(provider, minTime, minDistance, listener);
        };
    } catch (e) {
        send({ hook: 'device', event: 'hook_error', error: 'LocationManager: ' + e.message });
    }

    // ── Hook Contacts & Call Log Access ─────────────────────
    try {
        var ContentResolver = Java.use('android.content.ContentResolver');

        ContentResolver.query.overload(
            'android.net.Uri', '[Ljava.lang.String;', 'java.lang.String',
            '[Ljava.lang.String;', 'java.lang.String'
        ).implementation = function (uri, projection, selection, selectionArgs, sortOrder) {
            var uriStr = uri ? uri.toString() : '';

            // Track access to sensitive content providers
            if (uriStr.indexOf('content://contacts') !== -1 ||
                uriStr.indexOf('content://com.android.contacts') !== -1) {
                send({
                    hook: 'device',
                    event: 'contacts_query',
                    uri: uriStr,
                    severity: 'high',
                    timestamp: new Date().toISOString()
                });
            } else if (uriStr.indexOf('content://call_log') !== -1) {
                send({
                    hook: 'device',
                    event: 'call_log_query',
                    uri: uriStr,
                    severity: 'high',
                    timestamp: new Date().toISOString()
                });
            } else if (uriStr.indexOf('content://media') !== -1) {
                send({
                    hook: 'device',
                    event: 'media_query',
                    uri: uriStr,
                    severity: 'medium',
                    timestamp: new Date().toISOString()
                });
            }

            return this.query(uri, projection, selection, selectionArgs, sortOrder);
        };
    } catch (e) {
        send({ hook: 'device', event: 'hook_error', error: 'ContentResolver: ' + e.message });
    }

    // ── Hook Clipboard Access ───────────────────────────────
    try {
        var ClipboardManager = Java.use('android.content.ClipboardManager');

        ClipboardManager.getPrimaryClip.implementation = function () {
            var clip = this.getPrimaryClip();
            var text = null;
            if (clip && clip.getItemCount() > 0) {
                var item = clip.getItemAt(0);
                if (item.getText()) {
                    text = item.getText().toString().substring(0, 200);
                }
            }
            send({
                hook: 'device',
                event: 'clipboard_read',
                content_preview: text,
                severity: 'medium',
                timestamp: new Date().toISOString()
            });
            return clip;
        };

        ClipboardManager.setPrimaryClip.implementation = function (clip) {
            send({
                hook: 'device',
                event: 'clipboard_write',
                severity: 'medium',
                timestamp: new Date().toISOString()
            });
            return this.setPrimaryClip(clip);
        };
    } catch (e) {
        send({ hook: 'device', event: 'hook_error', error: 'ClipboardManager: ' + e.message });
    }

    // ── Hook Device Identifiers ─────────────────────────────
    try {
        var TelephonyManager = Java.use('android.telephony.TelephonyManager');

        TelephonyManager.getDeviceId.overload().implementation = function () {
            var id = this.getDeviceId();
            send({
                hook: 'device',
                event: 'get_device_id',
                type: 'IMEI',
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return id;
        };

        TelephonyManager.getSubscriberId.implementation = function () {
            var id = this.getSubscriberId();
            send({
                hook: 'device',
                event: 'get_subscriber_id',
                type: 'IMSI',
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return id;
        };

        TelephonyManager.getLine1Number.implementation = function () {
            var num = this.getLine1Number();
            send({
                hook: 'device',
                event: 'get_phone_number',
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return num;
        };

        TelephonyManager.getSimSerialNumber.implementation = function () {
            var sn = this.getSimSerialNumber();
            send({
                hook: 'device',
                event: 'get_sim_serial',
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return sn;
        };
    } catch (e) {
        send({ hook: 'device', event: 'hook_error', error: 'TelephonyManager: ' + e.message });
    }

    // ── Hook Settings.Secure (Android ID) ───────────────────
    try {
        var SettingsSecure = Java.use('android.provider.Settings$Secure');

        SettingsSecure.getString.implementation = function (resolver, name) {
            var result = this.getString(resolver, name);
            if (name === 'android_id') {
                send({
                    hook: 'device',
                    event: 'get_android_id',
                    severity: 'medium',
                    timestamp: new Date().toISOString()
                });
            }
            return result;
        };
    } catch (e) {
        send({ hook: 'device', event: 'hook_error', error: 'Settings.Secure: ' + e.message });
    }

    // ── Hook PackageManager (installed apps enumeration) ────
    try {
        var PackageManager = Java.use('android.app.ApplicationPackageManager');

        PackageManager.getInstalledPackages.implementation = function (flags) {
            send({
                hook: 'device',
                event: 'enumerate_packages',
                severity: 'medium',
                timestamp: new Date().toISOString()
            });
            return this.getInstalledPackages(flags);
        };

        PackageManager.getInstalledApplications.implementation = function (flags) {
            send({
                hook: 'device',
                event: 'enumerate_applications',
                severity: 'medium',
                timestamp: new Date().toISOString()
            });
            return this.getInstalledApplications(flags);
        };
    } catch (e) {
        send({ hook: 'device', event: 'hook_error', error: 'PackageManager: ' + e.message });
    }

    // ── Hook AccountManager ─────────────────────────────────
    try {
        var AccountManager = Java.use('android.accounts.AccountManager');

        AccountManager.getAccounts.implementation = function () {
            send({
                hook: 'device',
                event: 'get_accounts',
                severity: 'high',
                timestamp: new Date().toISOString()
            });
            return this.getAccounts();
        };
    } catch (e) {
        // AccountManager hooks
    }

    send({ hook: 'device', event: 'hooks_loaded', timestamp: new Date().toISOString() });
});
