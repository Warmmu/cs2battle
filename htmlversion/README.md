# CS2 内战匹配系统 - Web版本

一个基于 Node.js + Express + MongoDB 的 CS2 内战匹配系统网页版，支持玩家注册、ELO 匹配、地图 BP、比赛记录等功能。

## 🎯 功能特性

- ✅ 玩家注册与登录
- ✅ 退出登录功能
- ✅ 房间系统（自动匹配）
- ✅ ELO 平衡算法分队
- ✅ 地图 Ban/Pick 系统
- ✅ 比赛结果录入
- ✅ 自动 ELO 计算
- ✅ 历史战绩查询
- ✅ 排行榜系统

## 📁 项目结构

```
htmlversion/
├── backend/                # 后端服务
│   ├── server.js          # Express 服务器
│   ├── db.js              # 数据库连接
│   ├── routes/            # API 路由
│   │   ├── auth.js        # 登录/注册
│   │   ├── room.js        # 房间管理
│   │   ├── match.js       # 匹配分队
│   │   ├── bp.js          # 地图BP
│   │   ├── submit.js      # 提交结果
│   │   └── history.js     # 历史记录
│   └── package.json
├── frontend/              # 前端页面
│   ├── index.html         # 登录页面
│   ├── register.html      # 注册页面
│   ├── lobby.html         # 大厅页面
│   ├── bp.html           # BP页面
│   ├── match.html        # 比赛录入页面
│   ├── history.html      # 历史战绩
│   ├── ranking.html      # 排行榜
│   ├── css/
│   │   └── style.css     # 全局样式
│   └── js/
│       ├── api.js        # API 调用封装
│       └── utils.js      # 工具函数
└── README.md
```

## 🚀 快速开始

### 1. 前置要求

- Node.js (v14+)
- MongoDB (v4.4+)

### 2. 安装步骤

1. 安装后端依赖：
```bash
cd backend
npm install
```

2. 配置 MongoDB 连接：
编辑 `backend/db.js` 中的数据库连接字符串

3. 启动后端服务：
```bash
cd backend
npm start
```

4. 访问前端页面：
直接用浏览器打开 `frontend/index.html` 或使用本地服务器

### 3. 数据库配置

MongoDB 会自动创建以下集合：

- `players` - 玩家表
- `rooms` - 房间表
- `bp_records` - BP 记录表
- `matches` - 比赛表
- `player_stats` - 玩家统计表
- `elo_history` - ELO 历史表

## 🎮 使用流程

### 账号管理
1. **首次使用** - 进入登录页面，点击"立即注册"
2. **注册账号** - 输入昵称（可选 Steam ID）
3. **登录** - 已有账号可直接通过昵称登录
4. **退出登录** - 在大厅页面点击"退出"按钮

### 游戏流程
1. **加入房间** - 自动加入或创建房间
2. **准备** - 等待所有玩家准备
3. **匹配** - 系统自动根据 ELO 平衡分队
4. **BP 地图** - A Ban → B Ban → A Pick
5. **比赛** - 进行游戏
6. **录入结果** - 输入比分和每位玩家的 KD
7. **计算 ELO** - 系统自动计算并更新 ELO
8. **查看战绩** - 查看个人历史和排行榜

## 📊 ELO 计算公式

```
期望胜率: P = 1 / (1 + 10^((对方ELO - 己方ELO) / 400))
ELO变化: ΔElo = K × (实际得分 - 期望得分)

K 因子:
- ELO < 1200: K = 40 (新手变化快)
- 1200 ≤ ELO ≤ 1800: K = 32 (正常)
- ELO > 1800: K = 24 (高手变化慢)

KD 修正:
- KD > 1.5: 额外 20% 加成
- KD < 0.8: 减少 20%
```

## 🗺️ 地图池

当前支持的官方地图：
- Inferno
- Mirage
- Dust2
- Nuke
- Overpass
- Ancient
- Anubis

### BP流程
- **A队 Ban** → **B队 Ban** → **A队 Pick**
- **队内投票制**：需要队伍半数以上同意
- **实时同步**：所有玩家每2秒自动同步BP状态
- **权限控制**：只有当前轮到的队伍成员可以投票

## 🔧 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **后端**: Node.js + Express
- **数据库**: MongoDB
- **算法**: ELO 评分系统

## 📝 API 文档

### 认证接口

#### POST /api/auth/register
注册新玩家

#### POST /api/auth/login
玩家登录

### 房间接口

#### POST /api/room/join
加入/创建房间

#### POST /api/room/ready
设置准备状态

#### GET /api/room/:roomId
获取房间状态

#### GET /api/room/available
获取可用房间列表

#### POST /api/room/leave
离开房间

### 匹配接口

#### POST /api/match/start
开始匹配分队

### BP接口

#### POST /api/bp/start
开始BP

#### POST /api/bp/vote
BP投票

#### GET /api/bp/:bpId
获取BP状态

### 比赛接口

#### POST /api/submit/update
更新比赛数据

#### POST /api/submit/finish
提交比赛结果

#### GET /api/match/:roomId
获取比赛信息

### 历史/排行榜

#### GET /api/history/:playerId
获取玩家历史战绩

#### GET /api/ranking
获取排行榜

## 📄 License

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

