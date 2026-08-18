@echo off
echo ===================================================
echo Starting APEX-X Backend and Frontend...
echo ===================================================

:: Start Backend in a new command prompt window
start "APEX-X Backend" cmd /k "cd backend && set PYTHONPATH=.. && .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8080 --reload"

:: Start Frontend in a new command prompt window
start "APEX-X Frontend" cmd /k "cd frontend && npm run dev"

echo Both services have been launched in separate windows!
echo You can now observe the logs in those windows.
echo Press any key to close this launcher...
pause >nul
