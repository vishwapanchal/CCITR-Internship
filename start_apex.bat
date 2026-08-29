@echo off
echo ===================================================
echo Starting APEX-X Backend and Frontend...
echo ===================================================

echo Cleaning up ports 8080 and 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a 2>nul

:: Give the system a second to release the ports
timeout /t 2 /nobreak >nul

:: Start Backend in a new command prompt window
start "APEX-X Backend" cmd /k "set PYTHONPATH=%~dp0&& cd backend && .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8080 --reload"

:: Start Frontend in a new command prompt window
start "APEX-X Frontend" cmd /k "cd frontend && npm run dev"

echo Both services have been launched in separate windows!
echo You can now observe the logs in those windows.
echo Press any key to close this launcher...
pause >nul
