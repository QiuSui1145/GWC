@echo off
title GalGame Web Chat Starter

echo ========================================
echo   Welcome to GalGame Web Chat (GWC)
echo ========================================
echo.

:: Check if Node.js is installed
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not detected!
    echo Please install Node.js from https://nodejs.org/ first.
    pause
    exit
)

:: Check if node_modules exists, jump to start if it does
if exist "node_modules\" goto start_server

echo [INFO] First run detected. Installing dependencies automatically...
:: Use legacy-peer-deps to prevent rigorous version conflicts
call npm install --legacy-peer-deps

:: Check installation result outside of parentheses to avoid delayed expansion issues
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install dependencies. Please check your network.
    pause
    exit
)

echo [INFO] Dependencies installed successfully!
echo.

:start_server
echo [INFO] Starting local server...
call npm run dev

pause