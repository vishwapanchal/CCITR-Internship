/**
 * APEX-X Frida Hook: Cryptographic Operations
 * Hooks crypto-related APIs to capture:
 * - Cipher operations (encrypt/decrypt, algorithm, mode)
 * - Key generation and SecretKeySpec
 * - MessageDigest hashing
 * - Base64 encoding/decoding
 * - KeyStore operations
 */

'use strict';

Java.perform(function () {

    // ── Hook Cipher.getInstance ─────────────────────────────
    try {
        var Cipher = Java.use('javax.crypto.Cipher');

        Cipher.getInstance.overload('java.lang.String').implementation = function (transformation) {
            send({
                hook: 'crypto',
                event: 'cipher_get_instance',
                transformation: transformation,
                timestamp: new Date().toISOString()
            });
            return this.getInstance(transformation);
        };

        Cipher.getInstance.overload('java.lang.String', 'java.lang.String').implementation = function (transformation, provider) {
            send({
                hook: 'crypto',
                event: 'cipher_get_instance',
                transformation: transformation,
                provider: provider,
                timestamp: new Date().toISOString()
            });
            return this.getInstance(transformation, provider);
        };
    } catch (e) {
        send({ hook: 'crypto', event: 'hook_error', error: 'Cipher.getInstance: ' + e.message });
    }

    // ── Hook Cipher.init ────────────────────────────────────
    try {
        var Cipher = Java.use('javax.crypto.Cipher');

        Cipher.init.overload('int', 'java.security.Key').implementation = function (opmode, key) {
            var mode = opmode === 1 ? 'ENCRYPT' : (opmode === 2 ? 'DECRYPT' : 'MODE_' + opmode);
            var keyBytes = key.getEncoded();
            send({
                hook: 'crypto',
                event: 'cipher_init',
                mode: mode,
                algorithm: key.getAlgorithm(),
                key_format: key.getFormat(),
                key_length: keyBytes ? keyBytes.length * 8 : 0,
                key_hex: keyBytes ? _bytesToHex(keyBytes) : null,
                timestamp: new Date().toISOString()
            });
            return this.init(opmode, key);
        };
    } catch (e) {
        send({ hook: 'crypto', event: 'hook_error', error: 'Cipher.init: ' + e.message });
    }

    // ── Hook Cipher.doFinal ─────────────────────────────────
    try {
        var Cipher = Java.use('javax.crypto.Cipher');

        Cipher.doFinal.overload('[B').implementation = function (input) {
            var result = this.doFinal(input);
            send({
                hook: 'crypto',
                event: 'cipher_do_final',
                algorithm: this.getAlgorithm(),
                input_length: input ? input.length : 0,
                output_length: result ? result.length : 0,
                input_preview: input ? _bytesToHex(input).substring(0, 64) : null,
                output_preview: result ? _bytesToHex(result).substring(0, 64) : null,
                timestamp: new Date().toISOString()
            });
            return result;
        };
    } catch (e) {
        send({ hook: 'crypto', event: 'hook_error', error: 'Cipher.doFinal: ' + e.message });
    }

    // ── Hook SecretKeySpec ───────────────────────────────────
    try {
        var SecretKeySpec = Java.use('javax.crypto.spec.SecretKeySpec');

        SecretKeySpec.$init.overload('[B', 'java.lang.String').implementation = function (keyBytes, algorithm) {
            send({
                hook: 'crypto',
                event: 'secret_key_spec',
                algorithm: algorithm,
                key_length: keyBytes ? keyBytes.length * 8 : 0,
                key_hex: keyBytes ? _bytesToHex(keyBytes) : null,
                timestamp: new Date().toISOString()
            });
            return this.$init(keyBytes, algorithm);
        };
    } catch (e) {
        send({ hook: 'crypto', event: 'hook_error', error: 'SecretKeySpec: ' + e.message });
    }

    // ── Hook MessageDigest ──────────────────────────────────
    try {
        var MessageDigest = Java.use('java.security.MessageDigest');

        MessageDigest.getInstance.overload('java.lang.String').implementation = function (algorithm) {
            send({
                hook: 'crypto',
                event: 'message_digest',
                algorithm: algorithm,
                timestamp: new Date().toISOString()
            });
            return this.getInstance(algorithm);
        };

        MessageDigest.digest.overload('[B').implementation = function (input) {
            var result = this.digest(input);
            send({
                hook: 'crypto',
                event: 'message_digest_compute',
                algorithm: this.getAlgorithm(),
                input_length: input ? input.length : 0,
                hash_hex: result ? _bytesToHex(result) : null,
                timestamp: new Date().toISOString()
            });
            return result;
        };
    } catch (e) {
        send({ hook: 'crypto', event: 'hook_error', error: 'MessageDigest: ' + e.message });
    }

    // ── Hook Base64 ─────────────────────────────────────────
    try {
        var Base64 = Java.use('android.util.Base64');

        Base64.decode.overload('java.lang.String', 'int').implementation = function (str, flags) {
            var result = this.decode(str, flags);
            var preview = str.length > 100 ? str.substring(0, 100) + '...' : str;
            send({
                hook: 'crypto',
                event: 'base64_decode',
                input_preview: preview,
                input_length: str.length,
                output_length: result ? result.length : 0,
                timestamp: new Date().toISOString()
            });
            return result;
        };

        Base64.encodeToString.overload('[B', 'int').implementation = function (input, flags) {
            var result = this.encodeToString(input, flags);
            send({
                hook: 'crypto',
                event: 'base64_encode',
                input_length: input ? input.length : 0,
                output_preview: result ? result.substring(0, 100) : null,
                timestamp: new Date().toISOString()
            });
            return result;
        };
    } catch (e) {
        send({ hook: 'crypto', event: 'hook_error', error: 'Base64: ' + e.message });
    }

    // ── Hook KeyStore ───────────────────────────────────────
    try {
        var KeyStore = Java.use('java.security.KeyStore');

        KeyStore.load.overload('java.io.InputStream', '[C').implementation = function (stream, password) {
            send({
                hook: 'crypto',
                event: 'keystore_load',
                has_password: password !== null,
                type: this.getType(),
                timestamp: new Date().toISOString()
            });
            return this.load(stream, password);
        };
    } catch (e) {
        send({ hook: 'crypto', event: 'hook_error', error: 'KeyStore: ' + e.message });
    }

    // ── Utility: bytes to hex string ────────────────────────
    function _bytesToHex(bytes) {
        var hex = '';
        for (var i = 0; i < Math.min(bytes.length, 64); i++) {
            var b = (bytes[i] & 0xFF).toString(16);
            hex += (b.length === 1 ? '0' : '') + b;
        }
        return hex;
    }

    send({ hook: 'crypto', event: 'hooks_loaded', timestamp: new Date().toISOString() });
});
