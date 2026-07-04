@echo off
REM Kill any leftover emulators first
taskkill /IM qemu-system-x86_64.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

REM Launch the emulator directly (this opens the phone GUI window)
"%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone_API_36.1 -no-audio -no-snapshot-save
