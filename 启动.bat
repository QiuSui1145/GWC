@echo off
chcp 65001 >nul
title GalGame Web Chat 一键启动器

echo ========================================
echo   欢迎使用 GalGame Web Chat (GWC)
echo ========================================
echo.

:: 检查是否安装了 Node.js
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境！
    echo 请先前往 https://nodejs.org/ 安装 Node.js
    pause
    exit
)

:: 检查依赖文件夹是否存在
if not exist "node_modules\" (
    echo [状态] 初次运行，正在为您自动安装依赖，请耐心等待...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络或 npm 设置！
        pause
        exit
    )
    echo [状态] 依赖安装完成！
    echo.
)

echo [状态] 正在启动本地服务器...
call npm run dev

pause