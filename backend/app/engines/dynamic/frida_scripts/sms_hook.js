/**
 * APEX-X Frida Hook: SMS Interception
 * Hooks SMS-related APIs to capture:
 * - Outgoing SMS messages (sendTextMessage, sendMultipartTextMessage)
 * - SMS content provider queries (reading SMS inbox)
 * - SMS receive handlers
 */

'use strict';

Java.perform(function () {

    // ── Hook SmsManager.sendTextMessage ──────────────────────
    try {
        var SmsManager = Java.use('android.telephony.SmsManager');

        SmsManager.sendTextMessage.overload(
            'java.lang.String', 'java.lang.String', 'java.lang.String',
            'android.app.PendingIntent', 'android.app.PendingIntent'
        ).implementation = function (destAddr, scAddr, text, sentIntent, deliveryIntent) {
            send({
                hook: 'sms',
                event: 'send_sms',
                destination: destAddr ? destAddr.toString() : null,
                service_center: scAddr ? scAddr.toString() : null,
                message_body: text ? text.toString() : null,
                timestamp: new Date().toISOString()
            });
            return this.sendTextMessage(destAddr, scAddr, text, sentIntent, deliveryIntent);
        };

        // Hook sendMultipartTextMessage
        SmsManager.sendMultipartTextMessage.overload(
            'java.lang.String', 'java.lang.String', 'java.util.ArrayList',
            'java.util.ArrayList', 'java.util.ArrayList'
        ).implementation = function (destAddr, scAddr, parts, sentIntents, deliveryIntents) {
            var partsStr = [];
            if (parts) {
                var iter = parts.iterator();
                while (iter.hasNext()) {
                    partsStr.push(iter.next().toString());
                }
            }
            send({
                hook: 'sms',
                event: 'send_multipart_sms',
                destination: destAddr ? destAddr.toString() : null,
                parts: partsStr,
                timestamp: new Date().toISOString()
            });
            return this.sendMultipartTextMessage(destAddr, scAddr, parts, sentIntents, deliveryIntents);
        };
    } catch (e) {
        send({ hook: 'sms', event: 'hook_error', error: 'SmsManager hooks: ' + e.message });
    }

    // ── Hook ContentResolver for SMS content provider access ─
    try {
        var ContentResolver = Java.use('android.content.ContentResolver');

        ContentResolver.query.overload(
            'android.net.Uri', '[Ljava.lang.String;', 'java.lang.String',
            '[Ljava.lang.String;', 'java.lang.String'
        ).implementation = function (uri, projection, selection, selectionArgs, sortOrder) {
            var uriStr = uri ? uri.toString() : '';

            // Only log SMS-related content provider queries
            if (uriStr.indexOf('content://sms') !== -1 ||
                uriStr.indexOf('content://mms') !== -1) {
                send({
                    hook: 'sms',
                    event: 'sms_content_query',
                    uri: uriStr,
                    selection: selection ? selection.toString() : null,
                    timestamp: new Date().toISOString()
                });
            }

            return this.query(uri, projection, selection, selectionArgs, sortOrder);
        };
    } catch (e) {
        send({ hook: 'sms', event: 'hook_error', error: 'ContentResolver query: ' + e.message });
    }

    // ── Hook SmsMessage.createFromPdu (incoming SMS parsing) ─
    try {
        var SmsMessage = Java.use('android.telephony.SmsMessage');

        SmsMessage.createFromPdu.overload('[B').implementation = function (pdu) {
            var msg = this.createFromPdu(pdu);
            if (msg) {
                send({
                    hook: 'sms',
                    event: 'receive_sms',
                    originating_address: msg.getOriginatingAddress(),
                    message_body: msg.getMessageBody(),
                    timestamp: new Date().toISOString()
                });
            }
            return msg;
        };
    } catch (e) {
        // createFromPdu may not exist on all API levels
    }

    send({ hook: 'sms', event: 'hooks_loaded', timestamp: new Date().toISOString() });
});
