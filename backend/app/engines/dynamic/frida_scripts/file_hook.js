/**
 * APEX-X Frida Hook: File System Operations
 * Hooks file I/O APIs to capture:
 * - File reads and writes (FileInputStream, FileOutputStream)
 * - SharedPreferences access
 * - SQLite database operations
 * - Asset and raw resource access
 */

'use strict';

Java.perform(function () {

    // ── Hook FileOutputStream (file writes) ─────────────────
    try {
        var FileOutputStream = Java.use('java.io.FileOutputStream');

        FileOutputStream.$init.overload('java.lang.String').implementation = function (path) {
            send({
                hook: 'file',
                event: 'file_write',
                path: path,
                timestamp: new Date().toISOString()
            });
            return this.$init(path);
        };

        FileOutputStream.$init.overload('java.io.File').implementation = function (file) {
            send({
                hook: 'file',
                event: 'file_write',
                path: file ? file.getAbsolutePath() : null,
                timestamp: new Date().toISOString()
            });
            return this.$init(file);
        };

        FileOutputStream.$init.overload('java.lang.String', 'boolean').implementation = function (path, append) {
            send({
                hook: 'file',
                event: 'file_write',
                path: path,
                append: append,
                timestamp: new Date().toISOString()
            });
            return this.$init(path, append);
        };
    } catch (e) {
        send({ hook: 'file', event: 'hook_error', error: 'FileOutputStream: ' + e.message });
    }

    // ── Hook FileInputStream (file reads) ───────────────────
    try {
        var FileInputStream = Java.use('java.io.FileInputStream');

        FileInputStream.$init.overload('java.lang.String').implementation = function (path) {
            send({
                hook: 'file',
                event: 'file_read',
                path: path,
                timestamp: new Date().toISOString()
            });
            return this.$init(path);
        };

        FileInputStream.$init.overload('java.io.File').implementation = function (file) {
            send({
                hook: 'file',
                event: 'file_read',
                path: file ? file.getAbsolutePath() : null,
                timestamp: new Date().toISOString()
            });
            return this.$init(file);
        };
    } catch (e) {
        send({ hook: 'file', event: 'hook_error', error: 'FileInputStream: ' + e.message });
    }

    // ── Hook SharedPreferences ──────────────────────────────
    try {
        var SharedPreferencesEditor = Java.use('android.app.SharedPreferencesImpl$EditorImpl');

        SharedPreferencesEditor.putString.implementation = function (key, value) {
            send({
                hook: 'file',
                event: 'shared_pref_write',
                key: key,
                value: value ? value.substring(0, 200) : null,
                type: 'string',
                timestamp: new Date().toISOString()
            });
            return this.putString(key, value);
        };

        SharedPreferencesEditor.putInt.implementation = function (key, value) {
            send({
                hook: 'file',
                event: 'shared_pref_write',
                key: key,
                value: value,
                type: 'int',
                timestamp: new Date().toISOString()
            });
            return this.putInt(key, value);
        };

        SharedPreferencesEditor.putBoolean.implementation = function (key, value) {
            send({
                hook: 'file',
                event: 'shared_pref_write',
                key: key,
                value: value,
                type: 'boolean',
                timestamp: new Date().toISOString()
            });
            return this.putBoolean(key, value);
        };
    } catch (e) {
        send({ hook: 'file', event: 'hook_error', error: 'SharedPreferences: ' + e.message });
    }

    // Read access to SharedPreferences
    try {
        var SharedPreferencesImpl = Java.use('android.app.SharedPreferencesImpl');

        SharedPreferencesImpl.getString.implementation = function (key, defValue) {
            var result = this.getString(key, defValue);
            send({
                hook: 'file',
                event: 'shared_pref_read',
                key: key,
                value: result ? result.substring(0, 200) : null,
                type: 'string',
                timestamp: new Date().toISOString()
            });
            return result;
        };
    } catch (e) {
        // SharedPreferencesImpl may vary
    }

    // ── Hook SQLiteDatabase ─────────────────────────────────
    try {
        var SQLiteDatabase = Java.use('android.database.sqlite.SQLiteDatabase');

        SQLiteDatabase.execSQL.overload('java.lang.String').implementation = function (sql) {
            send({
                hook: 'file',
                event: 'sqlite_exec',
                sql: sql ? sql.substring(0, 500) : null,
                database: this.getPath(),
                timestamp: new Date().toISOString()
            });
            return this.execSQL(sql);
        };

        SQLiteDatabase.execSQL.overload('java.lang.String', '[Ljava.lang.Object;').implementation = function (sql, bindArgs) {
            send({
                hook: 'file',
                event: 'sqlite_exec',
                sql: sql ? sql.substring(0, 500) : null,
                database: this.getPath(),
                has_bind_args: bindArgs !== null,
                timestamp: new Date().toISOString()
            });
            return this.execSQL(sql, bindArgs);
        };

        SQLiteDatabase.rawQuery.overload('java.lang.String', '[Ljava.lang.String;').implementation = function (sql, selectionArgs) {
            send({
                hook: 'file',
                event: 'sqlite_query',
                sql: sql ? sql.substring(0, 500) : null,
                database: this.getPath(),
                timestamp: new Date().toISOString()
            });
            return this.rawQuery(sql, selectionArgs);
        };

        SQLiteDatabase.insert.implementation = function (table, nullColumnHack, values) {
            send({
                hook: 'file',
                event: 'sqlite_insert',
                table: table,
                database: this.getPath(),
                timestamp: new Date().toISOString()
            });
            return this.insert(table, nullColumnHack, values);
        };

        SQLiteDatabase.openOrCreateDatabase.overload('java.lang.String', 'android.database.sqlite.SQLiteDatabase$CursorFactory').implementation = function (path, factory) {
            send({
                hook: 'file',
                event: 'sqlite_open',
                path: path,
                timestamp: new Date().toISOString()
            });
            return this.openOrCreateDatabase(path, factory);
        };
    } catch (e) {
        send({ hook: 'file', event: 'hook_error', error: 'SQLiteDatabase: ' + e.message });
    }

    // ── Hook Runtime.exec (command execution) ───────────────
    try {
        var Runtime = Java.use('java.lang.Runtime');

        Runtime.exec.overload('java.lang.String').implementation = function (command) {
            send({
                hook: 'file',
                event: 'runtime_exec',
                command: command,
                severity: 'critical',
                timestamp: new Date().toISOString()
            });
            return this.exec(command);
        };

        Runtime.exec.overload('[Ljava.lang.String;').implementation = function (cmdarray) {
            var cmd = '';
            if (cmdarray) {
                for (var i = 0; i < cmdarray.length; i++) {
                    cmd += cmdarray[i] + ' ';
                }
            }
            send({
                hook: 'file',
                event: 'runtime_exec',
                command: cmd.trim(),
                severity: 'critical',
                timestamp: new Date().toISOString()
            });
            return this.exec(cmdarray);
        };
    } catch (e) {
        send({ hook: 'file', event: 'hook_error', error: 'Runtime.exec: ' + e.message });
    }

    // ── Hook ProcessBuilder (alternate command execution) ────
    try {
        var ProcessBuilder = Java.use('java.lang.ProcessBuilder');

        ProcessBuilder.start.implementation = function () {
            var cmdList = this.command();
            var cmd = '';
            if (cmdList) {
                var iter = cmdList.iterator();
                while (iter.hasNext()) {
                    cmd += iter.next() + ' ';
                }
            }
            send({
                hook: 'file',
                event: 'process_builder_start',
                command: cmd.trim(),
                severity: 'critical',
                timestamp: new Date().toISOString()
            });
            return this.start();
        };
    } catch (e) {
        send({ hook: 'file', event: 'hook_error', error: 'ProcessBuilder: ' + e.message });
    }

    send({ hook: 'file', event: 'hooks_loaded', timestamp: new Date().toISOString() });
});
