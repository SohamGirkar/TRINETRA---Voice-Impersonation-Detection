@echo off
title TRINETRA - Voice Impersonation Detection

echo ==========================================
echo       TRINETRA
echo   Voice Impersonation Detection
echo ==========================================
echo.

echo Starting Backend...
start "TRINETRA Backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && uvicorn app.main:app --reload"

timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "TRINETRA Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo TRINETRA is starting...
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000
echo.

start "" "http://localhost:5173"

echo Done.