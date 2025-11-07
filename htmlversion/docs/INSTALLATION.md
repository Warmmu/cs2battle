# 安装部署指南

## 环境要求

- Node.js 14.0 或更高版本
- MongoDB 4.4 或更高版本
- 现代浏览器（Chrome、Firefox、Edge、Safari 等）

## 安装步骤

### 1. 安装 MongoDB

#### Windows
1. 下载 MongoDB Community Server: https://www.mongodb.com/try/download/community
2. 运行安装程序，选择"Complete"安装
3. 选择"Install MongoDB as a Service"
4. 启动 MongoDB 服务

#### macOS
```bash
# 使用 Homebrew 安装
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu/Debian)
```bash
# 导入 MongoDB 公钥
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# 添加 MongoDB 源
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# 安装 MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. 安装 Node.js

访问 https://nodejs.org/ 下载并安装最新的 LTS 版本。

验证安装：
```bash
node --version
npm --version
```

### 3. 安装项目依赖

```bash
cd htmlversion/backend
npm install
```

### 4. 配置数据库连接

编辑 `backend/db.js` 文件，修改 MongoDB 连接字符串：

```javascript
// 默认本地连接
const url = 'mongodb://localhost:27017';

// 如果使用远程数据库，修改为：
const url = 'mongodb://username:password@host:port';
```

### 5. 启动后端服务器

```bash
cd htmlversion/backend
npm start
```

或使用开发模式（自动重启）：
```bash
npm run dev
```

服务器将运行在 http://localhost:3000

### 6. 访问前端页面

打开浏览器，访问：
```
http://localhost:3000/index.html
```

或者使用文件协议直接打开：
```
htmlversion/frontend/index.html
```

## 配置选项

### 端口配置

修改 `backend/server.js` 中的端口号：
```javascript
const PORT = process.env.PORT || 3000;
```

或通过环境变量设置：
```bash
PORT=8080 npm start
```

### API 地址配置

如果后端运行在不同的端口或服务器上，需要修改前端的 API 地址。

编辑 `frontend/js/api.js`：
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
// 修改为实际的 API 地址
```

## 生产环境部署

### 1. 使用 PM2 管理进程

安装 PM2：
```bash
npm install -g pm2
```

启动服务：
```bash
cd htmlversion/backend
pm2 start server.js --name cs2-match-system
```

设置开机自启：
```bash
pm2 startup
pm2 save
```

### 2. 使用 Nginx 反向代理

安装 Nginx：
```bash
# Ubuntu/Debian
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
```

配置文件 `/etc/nginx/sites-available/cs2-match-system`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/htmlversion/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/cs2-match-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. HTTPS 配置（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 故障排查

### MongoDB 连接失败

1. 检查 MongoDB 服务是否运行：
```bash
# Windows
net start MongoDB

# Linux/macOS
sudo systemctl status mongod
```

2. 检查端口是否被占用：
```bash
netstat -an | grep 27017
```

3. 查看 MongoDB 日志：
```bash
# Linux
sudo tail -f /var/log/mongodb/mongod.log

# macOS
tail -f /usr/local/var/log/mongodb/mongo.log
```

### 端口被占用

修改端口号或停止占用该端口的程序：
```bash
# 查看占用端口的程序
# Windows
netstat -ano | findstr :3000

# Linux/macOS
lsof -i :3000
```

### API 请求失败（跨域问题）

确保后端已启用 CORS，在 `backend/server.js` 中：
```javascript
const cors = require('cors');
app.use(cors());
```

### 页面无法加载

1. 检查控制台是否有错误信息
2. 确认 API_BASE_URL 配置正确
3. 检查网络请求是否成功

## 性能优化建议

### 数据库索引

确保数据库索引已创建（会在首次启动时自动创建）。

### 启用压缩

在 `backend/server.js` 中添加压缩中间件：
```javascript
const compression = require('compression');
app.use(compression());
```

### 静态资源缓存

在 Nginx 配置中添加缓存：
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 备份与恢复

### 数据库备份

```bash
# 备份
mongodump --db cs2_match_system --out /backup/path

# 恢复
mongorestore --db cs2_match_system /backup/path/cs2_match_system
```

### 自动备份脚本

创建 `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db cs2_match_system --out /backup/cs2_$DATE
# 删除 7 天前的备份
find /backup -name "cs2_*" -mtime +7 -exec rm -rf {} \;
```

添加到 crontab（每天凌晨 2 点备份）：
```bash
0 2 * * * /path/to/backup.sh
```

## 联系支持

如有问题，请提交 Issue 或联系开发团队。

