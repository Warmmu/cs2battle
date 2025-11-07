# 数据库设计文档

## 概述

本系统使用 MongoDB 作为数据库，数据库名称为 `cs2_match_system`。

## 集合列表

1. `players` - 玩家信息
2. `rooms` - 房间信息
3. `bp_records` - Ban/Pick 记录
4. `matches` - 比赛记录
5. `player_stats` - 玩家比赛统计
6. `elo_history` - ELO 历史记录

---

## 详细设计

### 1. players（玩家表）

存储所有玩家的基本信息和统计数据。

**字段说明：**

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| _id | ObjectId | 玩家ID | 主键 |
| nickname | String | 昵称 | 唯一索引 |
| steam_id | String | Steam ID（可选） | - |
| avatar | String | 头像URL（可选） | - |
| elo | Number | ELO评分 | 降序索引 |
| total_matches | Number | 总场次 | - |
| wins | Number | 胜场数 | - |
| losses | Number | 败场数 | - |
| total_kills | Number | 总击杀数 | - |
| total_deaths | Number | 总死亡数 | - |
| created_at | Date | 创建时间 | - |
| updated_at | Date | 更新时间 | - |

**示例数据：**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "nickname": "PlayerOne",
  "steam_id": "76561198012345678",
  "avatar": null,
  "elo": 1200,
  "total_matches": 50,
  "wins": 30,
  "losses": 20,
  "total_kills": 1000,
  "total_deaths": 800,
  "created_at": ISODate("2024-01-01T00:00:00Z"),
  "updated_at": ISODate("2024-01-15T10:30:00Z")
}
```

**索引：**

```javascript
db.players.createIndex({ nickname: 1 }, { unique: true })
db.players.createIndex({ elo: -1 })
db.players.createIndex({ created_at: -1 })
```

---

### 2. rooms（房间表）

存储房间状态和玩家信息。

**字段说明：**

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| _id | ObjectId | 房间ID | 主键 |
| status | String | 房间状态 | 普通索引 |
| players | Array | 玩家列表 | - |
| teamA | Array | A队玩家ID列表 | - |
| teamB | Array | B队玩家ID列表 | - |
| elo_diff | Number | 两队ELO差距 | - |
| bp_id | String | BP记录ID | - |
| created_at | Date | 创建时间 | 降序索引 |
| updated_at | Date | 更新时间 | - |

**status 取值：**
- `waiting`: 等待玩家
- `ready`: 所有玩家已准备
- `matching`: 正在匹配分队
- `bp`: BP阶段
- `playing`: 比赛中
- `finished`: 已完成

**players 结构：**

```javascript
{
  player_id: String,    // 玩家ID
  nickname: String,     // 昵称
  elo: Number,         // ELO
  ready: Boolean,      // 是否准备
  team: String         // 所属队伍（A|B|null）
}
```

**示例数据：**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "status": "bp",
  "players": [
    {
      "player_id": "507f1f77bcf86cd799439011",
      "nickname": "PlayerOne",
      "elo": 1200,
      "ready": true,
      "team": "A"
    },
    {
      "player_id": "507f1f77bcf86cd799439013",
      "nickname": "PlayerTwo",
      "elo": 1150,
      "ready": true,
      "team": "B"
    }
  ],
  "teamA": ["507f1f77bcf86cd799439011"],
  "teamB": ["507f1f77bcf86cd799439013"],
  "elo_diff": 50,
  "bp_id": "507f1f77bcf86cd799439014",
  "created_at": ISODate("2024-01-15T10:00:00Z"),
  "updated_at": ISODate("2024-01-15T10:30:00Z")
}
```

**索引：**

```javascript
db.rooms.createIndex({ status: 1 })
db.rooms.createIndex({ created_at: -1 })
```

---

### 3. bp_records（BP记录表）

存储地图 Ban/Pick 的过程和结果。

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | ObjectId | BP记录ID |
| room_id | String | 房间ID |
| maps | Array | 所有地图 |
| available_maps | Array | 可用地图 |
| bp_history | Array | BP历史记录 |
| final_map | String | 最终地图 |
| status | String | 状态（in_progress/completed） |
| current_step | Number | 当前步骤 |
| current_votes | Object | 当前投票 |
| created_at | Date | 创建时间 |

**bp_history 结构：**

```javascript
{
  team: String,        // A|B
  action: String,      // ban|pick
  map: String,         // 地图名
  votes: Object,       // 投票统计
  timestamp: Date      // 时间戳
}
```

**示例数据：**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "room_id": "507f1f77bcf86cd799439012",
  "maps": ["inferno", "mirage", "dust2", "nuke", "overpass", "ancient", "anubis"],
  "available_maps": ["dust2", "nuke", "overpass", "ancient", "anubis"],
  "bp_history": [
    {
      "team": "A",
      "action": "ban",
      "map": "inferno",
      "votes": { "inferno": 1 },
      "timestamp": ISODate("2024-01-15T10:31:00Z")
    },
    {
      "team": "B",
      "action": "ban",
      "map": "mirage",
      "votes": { "mirage": 1 },
      "timestamp": ISODate("2024-01-15T10:32:00Z")
    }
  ],
  "final_map": null,
  "status": "in_progress",
  "current_step": 2,
  "current_votes": {},
  "created_at": ISODate("2024-01-15T10:30:00Z")
}
```

---

### 4. matches（比赛表）

存储比赛基本信息和结果。

**字段说明：**

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| _id | ObjectId | 比赛ID | 主键 |
| room_id | String | 房间ID | 普通索引 |
| date | Date | 比赛日期 | 降序索引 |
| map | String | 地图 | - |
| teamA | Array | A队玩家ID | - |
| teamB | Array | B队玩家ID | - |
| score_a | Number | A队得分 | - |
| score_b | Number | B队得分 | - |
| winner | String | 获胜方（A/B/draw） | - |
| mvp_id | String | MVP玩家ID | - |
| status | String | 状态（playing/finished） | 普通索引 |
| player_stats | Array | 玩家统计数据 | - |
| created_at | Date | 创建时间 | - |
| finished_at | Date | 完成时间 | - |

**示例数据：**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "room_id": "507f1f77bcf86cd799439012",
  "date": ISODate("2024-01-15T10:30:00Z"),
  "map": "dust2",
  "teamA": ["507f1f77bcf86cd799439011"],
  "teamB": ["507f1f77bcf86cd799439013"],
  "score_a": 16,
  "score_b": 10,
  "winner": "A",
  "mvp_id": "507f1f77bcf86cd799439011",
  "status": "finished",
  "player_stats": [
    {
      "player_id": "507f1f77bcf86cd799439011",
      "kills": 25,
      "deaths": 15,
      "assists": 8
    }
  ],
  "created_at": ISODate("2024-01-15T10:35:00Z"),
  "finished_at": ISODate("2024-01-15T11:30:00Z")
}
```

**索引：**

```javascript
db.matches.createIndex({ room_id: 1 })
db.matches.createIndex({ date: -1 })
db.matches.createIndex({ status: 1 })
```

---

### 5. player_stats（玩家比赛统计表）

存储每位玩家在每场比赛中的详细统计。

**字段说明：**

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| _id | ObjectId | 统计ID | 主键 |
| match_id | String | 比赛ID | 普通索引 |
| player_id | String | 玩家ID | 普通索引 |
| team | String | 所属队伍（A/B） | - |
| kills | Number | 击杀数 | - |
| deaths | Number | 死亡数 | - |
| assists | Number | 助攻数 | - |
| kd_ratio | Number | K/D比率 | - |
| elo_before | Number | 赛前ELO | - |
| elo_after | Number | 赛后ELO | - |
| elo_change | Number | ELO变化 | - |
| created_at | Date | 创建时间 | - |

**示例数据：**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439016"),
  "match_id": "507f1f77bcf86cd799439015",
  "player_id": "507f1f77bcf86cd799439011",
  "team": "A",
  "kills": 25,
  "deaths": 15,
  "assists": 8,
  "kd_ratio": 1.67,
  "elo_before": 1200,
  "elo_after": 1228,
  "elo_change": 28,
  "created_at": ISODate("2024-01-15T11:30:00Z")
}
```

**索引：**

```javascript
db.player_stats.createIndex({ match_id: 1 })
db.player_stats.createIndex({ player_id: 1 })
db.player_stats.createIndex({ player_id: 1, created_at: -1 })
```

---

### 6. elo_history（ELO历史表）

记录玩家的 ELO 变化历史。

**字段说明：**

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| _id | ObjectId | 记录ID | 主键 |
| player_id | String | 玩家ID | 普通索引 |
| match_id | String | 比赛ID | - |
| elo_before | Number | 变化前ELO | - |
| elo_after | Number | 变化后ELO | - |
| elo_change | Number | ELO变化量 | - |
| reason | String | 原因（win/loss/draw） | - |
| created_at | Date | 创建时间 | 降序索引 |

**示例数据：**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439017"),
  "player_id": "507f1f77bcf86cd799439011",
  "match_id": "507f1f77bcf86cd799439015",
  "elo_before": 1200,
  "elo_after": 1228,
  "elo_change": 28,
  "reason": "win",
  "created_at": ISODate("2024-01-15T11:30:00Z")
}
```

**索引：**

```javascript
db.elo_history.createIndex({ player_id: 1 })
db.elo_history.createIndex({ created_at: -1 })
```

---

## 数据关系图

```
players (玩家)
    ↓ (1:N)
player_stats (比赛统计)
    ↓ (N:1)
matches (比赛)
    ↓ (1:1)
bp_records (BP记录)
    ↓ (1:1)
rooms (房间)

players (玩家)
    ↓ (1:N)
elo_history (ELO历史)
```

---

## 常用查询

### 1. 获取玩家排行榜（前50名）

```javascript
db.players.find({})
  .sort({ elo: -1 })
  .limit(50)
```

### 2. 获取玩家历史战绩（最近20场）

```javascript
db.player_stats.find({ player_id: "玩家ID" })
  .sort({ created_at: -1 })
  .limit(20)
```

### 3. 查找可用房间

```javascript
db.rooms.find({
  status: { $in: ['waiting', 'ready'] }
}).sort({ created_at: -1 })
```

### 4. 获取玩家 ELO 变化曲线

```javascript
db.elo_history.find({ player_id: "玩家ID" })
  .sort({ created_at: 1 })
```

### 5. 统计地图胜率

```javascript
db.matches.aggregate([
  { $match: { status: 'finished' } },
  { $group: {
    _id: '$map',
    total: { $sum: 1 },
    teamA_wins: {
      $sum: { $cond: [{ $eq: ['$winner', 'A'] }, 1, 0] }
    }
  }}
])
```

---

## 数据备份策略

### 1. 自动备份

使用 `mongodump` 进行定期备份：

```bash
# 每天备份
mongodump --db cs2_match_system --out /backup/$(date +%Y%m%d)
```

### 2. 数据恢复

使用 `mongorestore` 恢复数据：

```bash
mongorestore --db cs2_match_system /backup/20240115/cs2_match_system
```

### 3. 增量备份

使用 MongoDB Oplog 进行增量备份：

```bash
mongodump --oplog --out /backup/incremental
```

---

## 性能优化

### 1. 索引优化

- 为常用查询字段创建索引
- 使用复合索引优化多字段查询
- 定期分析索引使用情况

### 2. 查询优化

```javascript
// 使用投影减少数据传输
db.players.find(
  { elo: { $gt: 1500 } },
  { nickname: 1, elo: 1, _id: 0 }
)

// 使用聚合管道优化复杂查询
db.matches.aggregate([
  { $match: { status: 'finished' } },
  { $lookup: {
    from: 'players',
    localField: 'teamA',
    foreignField: '_id',
    as: 'team_a_players'
  }}
])
```

### 3. 连接池配置

```javascript
const client = new MongoClient(url, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 30000
});
```

---

## 数据清理

### 清理过期数据

```javascript
// 删除 30 天前的未完成房间
db.rooms.deleteMany({
  status: { $in: ['waiting', 'ready'] },
  created_at: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
})

// 删除 90 天前的比赛记录
db.matches.deleteMany({
  created_at: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
})
```

---

## 注意事项

1. **数据一致性**：使用事务确保多表操作的一致性
2. **索引维护**：定期检查和优化索引
3. **数据备份**：每日备份，保留至少 7 天
4. **性能监控**：使用 MongoDB Atlas 或第三方工具监控性能
5. **安全设置**：启用认证，限制数据库访问权限

## 监控指标

建议监控以下指标：
- 查询响应时间
- 连接池使用率
- 磁盘使用率
- 索引命中率
- 慢查询日志

