# 快速启动指南

## 一、环境准备

### 1. 安装 Node.js

访问 https://nodejs.org/ 下载并安装 LTS 版本（推荐 v18 或更高）。

验证安装：
```bash
node --version
npm --version
```

### 2. 安装 MongoDB

#### Windows
1. 下载：https://www.mongodb.com/try/download/community
2. 安装时选择 "Complete" 和 "Install MongoDB as a Service"
3. 安装完成后 MongoDB 会自动运行

#### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

验证 MongoDB：
```bash
mongosh
# 或
mongo
```

---

## 二、启动应用

### 方法一：使用启动脚本（推荐）

#### Windows
双击运行 `start.bat`

#### Linux/macOS
```bash
chmod +x start.sh
./start.sh
```

### 方法二：手动启动

```bash
# 1. 进入后端目录
cd htmlversion/backend

# 2. 安装依赖（首次运行）
npm install

# 3. 启动服务器
npm start
```

---

## 三、访问应用

启动成功后，打开浏览器访问：

```
http://localhost:3000/index.html
```

或直接打开前端文件：

```
htmlversion/frontend/index.html
```

---

## 四、使用流程

### 1. 注册/登录
- 首次使用点击"立即注册"
- 输入昵称完成注册
- 已有账号直接登录

### 2. 加入房间
- 在大厅点击"加入/创建房间"
- 等待其他玩家加入
- 所有玩家点击"准备"

### 3. 自动匹配
- 系统使用 ELO 算法自动分队
- 分为 A 队和 B 队

### 4. 地图 BP
- A队 Ban → B队 Ban → A队 Pick
- 投票制，需队伍半数以上同意
- 实时同步 BP 进度

### 5. 比赛录入
- 输入比分和玩家数据
- 实时保存和同步
- 提交后自动计算 ELO

### 6. 查看战绩
- 点击"战绩"查看历史记录
- 点击"排行榜"查看全服排名

---

## 五、常见问题

### Q1: 启动失败，提示端口被占用

**解决方法：**

修改 `backend/server.js` 中的端口号：

```javascript
const PORT = process.env.PORT || 3000;
// 改为其他端口，如 8080
```

或通过环境变量指定：

```bash
PORT=8080 npm start
```

### Q2: 无法连接数据库

**检查步骤：**

1. 确认 MongoDB 已启动
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/macOS
   sudo systemctl status mongod
   ```

2. 检查连接配置
   编辑 `backend/db.js`：
   ```javascript
   const url = 'mongodb://localhost:27017';
   ```

### Q3: 前端无法调用 API

**检查步骤：**

1. 确认后端已启动
2. 检查 `frontend/js/api.js` 中的 API 地址：
   ```javascript
   const API_BASE_URL = 'http://localhost:3000/api';
   ```
3. 打开浏览器控制台查看错误信息

### Q4: npm install 失败

**解决方法：**

```bash
# 清除缓存
npm cache clean --force

# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install
```

---

## 六、配置说明

### 修改端口

编辑 `backend/server.js`：
```javascript
const PORT = process.env.PORT || 3000;
```

### 修改数据库

编辑 `backend/db.js`：
```javascript
const url = 'mongodb://localhost:27017';
const dbName = 'cs2_match_system';
```

### 修改 API 地址

编辑 `frontend/js/api.js`：
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

---

## 七、开发模式

使用 nodemon 自动重启：

```bash
cd backend
npm install --save-dev nodemon
npm run dev
```

---

## 八、生产部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd htmlversion/backend
pm2 start server.js --name cs2-match-system

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs cs2-match-system

# 停止应用
pm2 stop cs2-match-system
```

### 使用 Docker

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

EXPOSE 3000

CMD ["node", "server.js"]
```

构建和运行：

```bash
docker build -t cs2-match-system .
docker run -d -p 3000:3000 --name cs2-match cs2-match-system
```

---

## 九、测试账号

系统不提供测试账号，请直接注册使用。

初始 ELO 分数：1000

---

## 十、技术支持

- **文档**：查看 `docs/` 目录下的详细文档
  - `INSTALLATION.md` - 详细安装指南
  - `USER_GUIDE.md` - 用户使用手册
  - `API.md` - API 接口文档
  - `DATABASE.md` - 数据库设计文档

- **问题反馈**：提交 GitHub Issue

- **源码**：查看项目 README.md

---

## 十一、功能特性

✅ 玩家注册与登录  
✅ 房间系统（自动匹配）  
✅ ELO 平衡算法分队  
✅ 地图 Ban/Pick 系统  
✅ 投票机制（队伍半数以上）  
✅ 实时数据同步  
✅ 比赛结果录入  
✅ 协同录入（多人同时编辑）  
✅ 自动 ELO 计算  
✅ 历史战绩查询  
✅ 排行榜系统  

---

## 十二、系统要求

**最低配置：**
- CPU: 双核 2.0GHz
- 内存: 2GB RAM
- 磁盘: 500MB 可用空间
- 系统: Windows 10 / macOS 10.14 / Ubuntu 18.04

**推荐配置：**
- CPU: 四核 2.5GHz
- 内存: 4GB RAM
- 磁盘: 1GB 可用空间
- 系统: Windows 11 / macOS 12 / Ubuntu 22.04

**浏览器支持：**
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

---

## 十三、版本信息

- **当前版本**: v1.0.0
- **发布日期**: 2024-01-01
- **开发语言**: JavaScript (Node.js + 原生前端)
- **数据库**: MongoDB
- **框架**: Express.js

---

## 十四、更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- ✅ 完整的比赛流程
- ✅ ELO 评分系统
- ✅ 实时数据同步
- ✅ 投票机制

---

祝您使用愉快！🎮

如有问题，请查看详细文档或提交 Issue。

