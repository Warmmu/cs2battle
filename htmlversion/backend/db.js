// 数据库连接配置
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB 连接 URL
// 修改为你的 MongoDB 连接字符串
const url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const dbName = 'cs2_match_system';

let db = null;
let client = null;

// 连接数据库
async function connectDB() {
  try {
    client = new MongoClient(url);
    await client.connect();
    console.log('✅ MongoDB 连接成功');
    db = client.db(dbName);
    
    // 创建索引
    await createIndexes();
    
    return db;
  } catch (err) {
    console.error('❌ MongoDB 连接失败:', err);
    process.exit(1);
  }
}

// 创建索引
async function createIndexes() {
  try {
    // players 集合索引
    await db.collection('players').createIndex({ nickname: 1 }, { unique: true });
    await db.collection('players').createIndex({ elo: -1 });
    
    // rooms 集合索引
    await db.collection('rooms').createIndex({ status: 1 });
    await db.collection('rooms').createIndex({ created_at: -1 });
    
    // matches 集合索引
    await db.collection('matches').createIndex({ room_id: 1 });
    await db.collection('matches').createIndex({ date: -1 });
    await db.collection('matches').createIndex({ status: 1 });
    
    // player_stats 集合索引
    await db.collection('player_stats').createIndex({ match_id: 1 });
    await db.collection('player_stats').createIndex({ player_id: 1 });
    
    // elo_history 集合索引
    await db.collection('elo_history').createIndex({ player_id: 1 });
    await db.collection('elo_history').createIndex({ created_at: -1 });
    
    console.log('✅ 数据库索引创建成功');
  } catch (err) {
    console.error('⚠️ 索引创建失败（可能已存在）:', err.message);
  }
}

// 获取数据库连接
function getDB() {
  if (!db) {
    throw new Error('数据库未连接，请先调用 connectDB()');
  }
  return db;
}

// 获取集合
function getCollection(collectionName) {
  return getDB().collection(collectionName);
}

// 关闭数据库连接
async function closeDB() {
  if (client) {
    await client.close();
    console.log('数据库连接已关闭');
  }
}

// 导出 ObjectId 用于 ID 转换
module.exports = {
  connectDB,
  getDB,
  getCollection,
  closeDB,
  ObjectId
};

