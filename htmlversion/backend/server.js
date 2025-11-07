// Express 服务器
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务（前端页面）
app.use(express.static('../frontend'));

// 导入路由
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const matchRoutes = require('./routes/match');
const bpRoutes = require('./routes/bp');
const submitRoutes = require('./routes/submit');
const historyRoutes = require('./routes/history');

// 使用路由
app.use('/api/auth', authRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/bp', bpRoutes);
app.use('/api/submit', submitRoutes);
app.use('/api/history', historyRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CS2 匹配系统运行中' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    code: 500, 
    message: '服务器内部错误',
    error: err.message 
  });
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDB();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📝 API 文档: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});

startServer();

