#!/bin/bash

echo "========================================"
echo "CS2 内战匹配系统 - 启动脚本"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 MongoDB
if ! command -v mongod &> /dev/null; then
    echo "[警告] 未找到 MongoDB，请确保 MongoDB 已安装并运行"
fi

cd backend

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
fi

echo ""
echo "启动服务器..."
echo "========================================"
echo "访问地址: http://localhost:3000"
echo "按 Ctrl+C 停止服务器"
echo "========================================"
echo ""

npm start

