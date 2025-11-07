@echo off
echo ========================================
echo CS2 内战匹配系统 - 启动脚本
echo ========================================
echo.

echo 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo 检查 MongoDB...
where mongod >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到 MongoDB，请确保 MongoDB 已安装并运行
)

cd backend

echo.
echo 检查依赖...
if not exist "node_modules" (
    echo 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 启动服务器...
echo ========================================
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

call npm start

pause

