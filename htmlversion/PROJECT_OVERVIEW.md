# CS2 内战匹配系统 - 网页版本

## 项目概述

这是从微信小程序版本转换而来的纯 Web 应用，完全去除了微信相关的服务和依赖，使用标准的 Web 技术栈实现。

## 技术栈

### 后端
- **运行时**: Node.js v14+
- **框架**: Express.js v4.18
- **数据库**: MongoDB v4.4+
- **中间件**: 
  - cors - 跨域支持
  - body-parser - 请求体解析

### 前端
- **核心**: HTML5 + CSS3 + JavaScript (原生)
- **架构**: MVC 模式
- **API 调用**: Fetch API
- **存储**: LocalStorage
- **样式**: CSS Grid + Flexbox

### 主要改动

| 微信小程序 API | Web 替代方案 |
|---------------|-------------|
| wx.cloud.callFunction() | fetch() + REST API |
| wx.cloud.database() | MongoDB + Express |
| wx.getStorageSync() | localStorage |
| wx.showToast() | 自定义 Toast 组件 |
| wx.showModal() | 自定义 Modal 组件 |
| wx.showLoading() | 自定义 Loading 组件 |
| wx.navigateTo() | window.location.href |
| .wxml | .html |
| .wxss | .css |

## 项目结构

```
htmlversion/
├── backend/                    # 后端服务
│   ├── server.js              # Express 服务器
│   ├── db.js                  # MongoDB 连接
│   ├── package.json           # 依赖配置
│   └── routes/                # API 路由
│       ├── auth.js           # 认证接口
│       ├── room.js           # 房间管理
│       ├── match.js          # 匹配分队
│       ├── bp.js             # 地图 BP
│       ├── submit.js         # 比赛提交
│       └── history.js        # 历史/排行榜
│
├── frontend/                   # 前端页面
│   ├── index.html             # 登录页面
│   ├── register.html          # 注册页面
│   ├── lobby.html             # 大厅页面
│   ├── bp.html               # BP 页面
│   ├── match.html            # 比赛录入
│   ├── history.html          # 历史战绩
│   ├── ranking.html          # 排行榜
│   ├── css/
│   │   └── style.css         # 全局样式
│   └── js/
│       ├── api.js            # API 封装
│       └── utils.js          # 工具函数
│
├── docs/                       # 文档
│   ├── INSTALLATION.md        # 安装指南
│   ├── USER_GUIDE.md          # 用户手册
│   ├── API.md                 # API 文档
│   └── DATABASE.md            # 数据库文档
│
├── README.md                   # 项目说明
├── QUICK_START.md             # 快速启动
├── start.bat                  # Windows 启动脚本
├── start.sh                   # Linux/Mac 启动脚本
└── .gitignore                 # Git 忽略文件
```

## 核心功能

### 1. 认证系统
- ✅ 玩家注册（昵称 + 可选 Steam ID）
- ✅ 玩家登录（基于昵称）
- ✅ 会话管理（LocalStorage）
- ✅ 退出登录

### 2. 房间系统
- ✅ 自动创建/加入房间
- ✅ 房间状态实时同步（2秒轮询）
- ✅ 玩家准备状态管理
- ✅ 可用房间列表（5秒刷新）
- ✅ 离开房间功能

### 3. 匹配系统
- ✅ ELO 平衡算法
- ✅ 暴力枚举最优分队
- ✅ 最小化队伍 ELO 差距
- ✅ 自动触发匹配

### 4. BP 系统
- ✅ 地图 Ban/Pick 流程（A Ban → B Ban → A Pick）
- ✅ 队内投票机制（半数以上通过）
- ✅ 实时状态同步（1.5秒轮询）
- ✅ 权限控制（只有当前队伍可投票）
- ✅ 投票进度显示
- ✅ BP 历史记录

### 5. 比赛录入
- ✅ 比分录入
- ✅ 玩家数据统计（K/D/A）
- ✅ 自动保存（1秒防抖）
- ✅ 实时同步（2秒轮询）
- ✅ 协同录入（多人可编辑）
- ✅ 数据验证

### 6. ELO 计算
- ✅ 标准 ELO 公式
- ✅ 动态 K 因子（新手/正常/高手）
- ✅ KD 表现修正（±20%）
- ✅ 队伍平均 ELO 计算
- ✅ 期望胜率计算
- ✅ 自动更新玩家 ELO

### 7. 统计系统
- ✅ 个人历史战绩（最近20场）
- ✅ 全服排行榜（前50名）
- ✅ 胜率统计
- ✅ K/D 统计
- ✅ ELO 变化曲线
- ✅ 地图统计

## 数据库设计

### 集合列表

1. **players** - 玩家信息
   - 昵称、ELO、战绩统计

2. **rooms** - 房间信息
   - 状态、玩家列表、队伍分组

3. **bp_records** - BP 记录
   - 可用地图、BP 历史、投票状态

4. **matches** - 比赛记录
   - 地图、比分、队伍、状态

5. **player_stats** - 玩家比赛统计
   - K/D/A、ELO 变化

6. **elo_history** - ELO 历史
   - 每场比赛的 ELO 变化记录

### 索引优化

- `players.nickname` - 唯一索引
- `players.elo` - 降序索引（排行榜）
- `rooms.status` - 普通索引（查找可用房间）
- `matches.date` - 降序索引（历史记录）
- `player_stats.player_id` + `created_at` - 复合索引

## API 接口

### 认证
- POST `/api/auth/register` - 注册
- POST `/api/auth/login` - 登录

### 房间
- POST `/api/room/join` - 加入房间
- POST `/api/room/ready` - 设置准备
- GET `/api/room/:roomId` - 获取房间状态
- GET `/api/room` - 获取房间列表
- POST `/api/room/leave` - 离开房间

### 匹配
- POST `/api/match/start` - 开始匹配

### BP
- POST `/api/bp/start` - 开始 BP
- POST `/api/bp/vote` - BP 投票
- GET `/api/bp/:bpId` - 获取 BP 状态

### 比赛
- POST `/api/submit/update` - 更新数据
- POST `/api/submit/finish` - 提交结果
- GET `/api/submit/:roomId` - 获取比赛信息

### 历史
- GET `/api/history/player/:playerId` - 玩家历史
- GET `/api/history/ranking` - 排行榜
- GET `/api/history/player-info/:playerId` - 玩家信息

## 特色功能

### 1. 实时同步
- 房间状态每 2 秒自动同步
- BP 进度每 1.5 秒同步
- 比赛数据每 2 秒同步
- 房间列表每 5 秒刷新

### 2. 投票机制
- 队伍半数以上同意才能执行
- 防止单人决定
- 实时显示投票进度
- 自动清空投票记录

### 3. 协同录入
- 所有玩家可同时编辑
- 1 秒防抖自动保存
- 实时同步所有玩家
- 避免数据冲突

### 4. 公平匹配
- ELO 平衡算法
- 考虑所有可能组合
- 最小化队伍差距
- 显示平衡结果

### 5. 智能计算
- 动态 K 因子
- KD 表现加成
- 期望胜率计算
- 自动更新统计

## 性能优化

### 后端
- 数据库连接池（最大50，最小10）
- 索引优化（减少查询时间）
- 聚合查询（减少数据传输）
- 投影查询（只返回需要的字段）

### 前端
- 防抖机制（减少 API 调用）
- 轮询优化（避免重复请求）
- LocalStorage 缓存（减少网络请求）
- CSS Grid 布局（提高渲染性能）

## 安全措施

### 后端
- CORS 跨域配置
- 请求体大小限制
- 错误处理中间件
- 数据验证

### 前端
- 输入验证
- XSS 防护（使用 textContent）
- 登录状态检查
- 会话过期处理

## 部署方案

### 开发环境
```bash
cd backend
npm install
npm start
```

### 生产环境（PM2）
```bash
npm install -g pm2
cd backend
pm2 start server.js --name cs2-match-system
pm2 startup
pm2 save
```

### Docker 部署
```bash
docker build -t cs2-match-system .
docker run -d -p 3000:3000 cs2-match-system
```

### Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/frontend;
        try_files $uri /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

## 测试建议

### 功能测试
- ✅ 注册/登录流程
- ✅ 房间创建和加入
- ✅ 匹配算法准确性
- ✅ BP 投票机制
- ✅ 比赛数据同步
- ✅ ELO 计算正确性

### 性能测试
- 并发用户测试（100+）
- API 响应时间（< 200ms）
- 数据库查询性能
- 前端加载速度

### 压力测试
- 同时 1000+ 连接
- 数据库连接池测试
- 内存使用监控
- CPU 使用监控

## 未来规划

### v1.1
- [ ] Steam 登录集成
- [ ] WebSocket 实时通信
- [ ] 赛季系统
- [ ] 更详细的数据分析

### v1.2
- [ ] 队伍系统
- [ ] 好友系统
- [ ] 聊天功能
- [ ] 成就系统

### v1.3
- [ ] Rating 2.0 系统
- [ ] MVP 评选
- [ ] 数据可视化
- [ ] 移动端适配

## 维护指南

### 日常维护
- 每日备份数据库
- 监控服务器状态
- 检查错误日志
- 清理过期数据

### 数据备份
```bash
# 每日备份
mongodump --db cs2_match_system --out /backup/$(date +%Y%m%d)

# 清理旧备份（保留7天）
find /backup -name "cs2_*" -mtime +7 -exec rm -rf {} \;
```

### 性能监控
- 使用 PM2 监控进程
- MongoDB 慢查询日志
- Nginx 访问日志分析
- 定期检查索引使用

## 故障排查

### 常见问题

1. **无法连接数据库**
   - 检查 MongoDB 是否运行
   - 验证连接字符串
   - 检查防火墙设置

2. **API 请求失败**
   - 检查 CORS 配置
   - 验证 API_BASE_URL
   - 查看浏览器控制台

3. **数据不同步**
   - 检查轮询是否正常
   - 验证网络连接
   - 刷新页面重试

4. **ELO 计算异常**
   - 检查算法参数
   - 验证输入数据
   - 查看后端日志

## 贡献指南

### 代码规范
- 使用 2 空格缩进
- 变量使用驼峰命名
- 函数命名清晰明确
- 添加必要注释

### 提交规范
```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建/工具变更
```

### Pull Request
1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 PR

## 许可证

MIT License - 详见 LICENSE 文件

## 联系方式

- 项目地址：GitHub Repository
- 问题反馈：GitHub Issues
- 文档：查看 docs/ 目录

---

## 总结

本项目成功将微信小程序完整转换为纯 Web 应用，保留了所有核心功能，并进行了以下优化：

✅ **技术栈现代化** - 使用标准 Web 技术  
✅ **架构清晰** - 前后端分离  
✅ **功能完整** - 所有功能正常运行  
✅ **性能优化** - 索引、缓存、防抖  
✅ **文档完善** - 详细的使用和开发文档  
✅ **易于部署** - 多种部署方案  
✅ **可扩展性** - 模块化设计，便于扩展  

**项目特点：**
- 🚀 快速启动 - 一键启动脚本
- 📱 响应式设计 - 适配各种屏幕
- 🎨 现代 UI - 美观的用户界面
- ⚡ 实时同步 - 多人协同无延迟
- 🎯 公平匹配 - 科学的 ELO 算法
- 📊 数据分析 - 完整的统计功能

**适用场景：**
- CS2 战队内战
- 电竞俱乐部训练
- 朋友约战
- 社区比赛

感谢使用本系统！🎮

