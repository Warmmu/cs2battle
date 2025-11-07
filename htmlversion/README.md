# CS2 内战匹配系统

基于 FastAPI + JSON 文件存储的 CS2 内战匹配系统，无需数据库，开箱即用。

## ✨ 特性

- 🎮 完整的 CS2 匹配流程：房间 → 匹配 → BP → 对战 → ELO 计算
- ⚖️ ELO 平衡算法自动分队
- 🗺️ 完整的 Ban/Pick 地图选择流程
- 📊 玩家战绩统计和排行榜
- 💾 无需数据库，使用 JSON 文件存储
- 🚀 一键启动，自动配置虚拟环境

## 📦 系统要求

- **Python 3.8+** （必需）
- Windows / Linux / MacOS

## 🚀 快速开始

### Windows

双击运行 `start.bat`，脚本会自动：
1. 检查 Python 环境
2. 创建虚拟环境
3. 安装依赖包
4. 启动服务器

### Linux / MacOS

```bash
chmod +x start.sh
./start.sh
```

### 首次运行

首次运行时，脚本会自动：
- 创建 Python 虚拟环境（`backend_py/venv/`）
- 安装所有依赖包（FastAPI、uvicorn 等）
- 初始化数据存储目录（`backend_py/data/`）

这个过程可能需要 1-3 分钟，请耐心等待。

## 🌐 访问系统

启动成功后，在浏览器访问：

- **前端页面**: http://localhost:3000
- **API 文档**: http://localhost:3000/docs
- **健康检查**: http://localhost:3000/api/health

## 📁 项目结构

```
cs2battle/
├── backend_py/              # Python 后端
│   ├── main.py             # 主应用
│   ├── requirements.txt    # Python 依赖
│   ├── routers/            # API 路由
│   │   ├── auth.py        # 认证接口
│   │   ├── room.py        # 房间管理
│   │   ├── match.py       # 匹配分队
│   │   ├── bp.py          # Ban/Pick
│   │   ├── submit.py      # 结果提交
│   │   └── history.py     # 历史记录
│   ├── utils/             # 工具函数
│   │   └── storage.py     # JSON 存储
│   ├── data/              # 数据文件（自动创建）
│   └── venv/              # 虚拟环境（自动创建）
├── frontend/              # 前端页面
│   ├── index.html        # 首页
│   ├── lobby.html        # 大厅
│   ├── bp.html           # BP 页面
│   ├── match.html        # 对战页面
│   └── ranking.html      # 排行榜
├── start.bat             # Windows 启动脚本
└── start.sh              # Linux/Mac 启动脚本
```

## 🎮 使用流程

1. **注册/登录** - 输入昵称即可
2. **加入房间** - 自动匹配或创建房间
3. **准备就绪** - 所有玩家点击准备
4. **自动分队** - ELO 平衡算法自动分队
5. **Ban/Pick** - 队伍投票选择地图
6. **开始对战** - 进入游戏
7. **提交结果** - 录入比分和数据
8. **ELO 更新** - 自动计算并更新 ELO

## 📊 数据存储

所有数据保存在 `backend_py/data/` 目录下的 JSON 文件中：

- `players.json` - 玩家信息
- `rooms.json` - 房间数据
- `matches.json` - 比赛记录
- `bp_records.json` - BP 记录
- `player_stats.json` - 玩家统计
- `elo_history.json` - ELO 历史

## 🔧 开发

### 手动启动（开发模式）

```bash
cd backend_py
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### API 文档

访问 http://localhost:3000/docs 查看交互式 API 文档（Swagger UI）

## ❓ 常见问题

### Q: 提示 Python 未找到？
A: 访问 https://python.org 下载安装 Python 3.8+，安装时勾选 "Add Python to PATH"

### Q: 安装依赖失败？
A: 检查网络连接，或使用国内镜像：
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q: 端口 3000 被占用？
A: 修改 `backend_py/main.py` 中的 `port=3000` 为其他端口

### Q: 如何备份数据？
A: 复制整个 `backend_py/data/` 目录即可

### Q: 如何重置数据？
A: 删除 `backend_py/data/` 目录，重新启动服务器会自动创建空数据文件

## 📝 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
