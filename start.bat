@echo off
title Vortex-Gen Remastered Launcher
echo ========================================================
echo   Starting Vortex-Gen Remastered (Backend + Frontend)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend Server (Port 5000)...
start "Vortex-Gen Backend" cmd /k "cd backend && node server.js"

echo [2/2] Starting Frontend Server (Port 5173)...
start "Vortex-Gen Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting up in separate terminal windows:
echo   - Backend:  http://localhost:5000
echo   - Frontend: http://localhost:5173
echo.
echo Press any key to exit this launcher window...
pause >nul

