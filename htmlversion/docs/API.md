# API 文档

## 基本信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **响应格式**: JSON

## 通用响应格式

所有 API 返回格式统一为：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {}
}
```

### 状态码说明

- `0`: 成功
- `1001`: 参数错误/业务逻辑错误
- `1002`: 玩家不存在
- `1003`: 资源不存在（房间/BP记录/比赛）
- `1005`: 状态错误
- `1006`: 权限不足
- `9999`: 服务器错误

---

## 认证接口

### 注册

**POST** `/api/auth/register`

注册新玩家账号。

**请求参数：**

```json
{
  "nickname": "玩家昵称",
  "steam_id": "Steam ID（可选）",
  "avatar": "头像URL（可选）"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "player_id": "507f1f77bcf86cd799439011",
    "nickname": "玩家昵称",
    "elo": 1000
  }
}
```

### 登录

**POST** `/api/auth/login`

玩家登录。

**请求参数：**

```json
{
  "nickname": "玩家昵称"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "player_id": "507f1f77bcf86cd799439011",
    "nickname": "玩家昵称",
    "elo": 1200,
    "total_matches": 50,
    "wins": 30,
    "losses": 20
  }
}
```

---

## 房间接口

### 加入/创建房间

**POST** `/api/room/join`

加入可用房间或创建新房间。

**请求参数：**

```json
{
  "player_id": "玩家ID"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "加入房间成功",
  "data": {
    "_id": "房间ID",
    "status": "waiting",
    "players": [
      {
        "player_id": "玩家ID",
        "nickname": "昵称",
        "elo": 1000,
        "ready": false,
        "team": null
      }
    ],
    "teamA": [],
    "teamB": [],
    "elo_diff": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 设置准备状态

**POST** `/api/room/ready`

设置玩家的准备状态。

**请求参数：**

```json
{
  "player_id": "玩家ID",
  "room_id": "房间ID",
  "ready": true
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "已准备",
  "data": {
    "ready": true,
    "all_ready": false
  }
}
```

### 获取房间状态

**GET** `/api/room/:roomId`

获取指定房间的详细信息。

**响应示例：**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "_id": "房间ID",
    "status": "ready",
    "players": [...],
    "teamA": ["player_id1", "player_id2"],
    "teamB": ["player_id3", "player_id4"]
  }
}
```

### 获取可用房间列表

**GET** `/api/room`

获取所有可用房间列表。

**响应示例：**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "_id": "房间ID",
      "player_count": 4,
      "status": "waiting",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 离开房间

**POST** `/api/room/leave`

离开当前房间。

**请求参数：**

```json
{
  "player_id": "玩家ID",
  "room_id": "房间ID"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "已离开房间",
  "data": null
}
```

---

## 匹配接口

### 开始匹配

**POST** `/api/match/start`

开始 ELO 平衡匹配分队。

**请求参数：**

```json
{
  "room_id": "房间ID"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "匹配成功",
  "data": {
    "teamA": [
      {
        "player_id": "ID",
        "nickname": "昵称",
        "elo": 1200
      }
    ],
    "teamB": [...],
    "elo_diff": 50,
    "teamA_avg_elo": 1150,
    "teamB_avg_elo": 1100
  }
}
```

---

## BP 接口

### 开始 BP

**POST** `/api/bp/start`

开始地图 Ban/Pick 流程。

**请求参数：**

```json
{
  "room_id": "房间ID"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "BP 开始",
  "data": {
    "bp_id": "BP记录ID",
    "maps": ["inferno", "mirage", "dust2", "nuke", "overpass", "ancient", "anubis"],
    "next_action": {
      "team": "A",
      "action": "ban",
      "desc": "A队 Ban 地图"
    }
  }
}
```

### BP 投票

**POST** `/api/bp/vote`

对地图进行投票 Ban/Pick。

**请求参数：**

```json
{
  "bp_id": "BP记录ID",
  "team": "A",
  "map": "inferno",
  "bp_action": "ban",
  "player_id": "玩家ID"
}
```

**响应示例（未达到所需票数）：**

```json
{
  "code": 0,
  "message": "已投票 inferno，当前进度：1/2",
  "data": {
    "votes": {
      "player_id1": "inferno"
    },
    "vote_counts": {
      "inferno": 1
    },
    "required_votes": 2,
    "waiting_for_votes": true
  }
}
```

**响应示例（达到票数，执行BP）：**

```json
{
  "code": 0,
  "message": "A 队 Ban 掉 inferno",
  "data": {
    "available_maps": ["mirage", "dust2", "nuke", "overpass", "ancient", "anubis"],
    "final_map": null,
    "completed": false,
    "next_action": {
      "team": "B",
      "action": "ban"
    },
    "selected_map": "inferno"
  }
}
```

### 获取 BP 状态

**GET** `/api/bp/:bpId`

获取 BP 记录的当前状态。

**响应示例：**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "_id": "BP记录ID",
    "room_id": "房间ID",
    "maps": [...],
    "available_maps": ["dust2", "nuke", "overpass", "ancient", "anubis"],
    "bp_history": [
      {
        "team": "A",
        "action": "ban",
        "map": "inferno",
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      {
        "team": "B",
        "action": "ban",
        "map": "mirage",
        "timestamp": "2024-01-01T00:01:00.000Z"
      }
    ],
    "final_map": null,
    "status": "in_progress",
    "current_step": 2,
    "current_votes": {},
    "next_action": {
      "team": "A",
      "action": "pick"
    },
    "server_time": "2024-01-01T00:01:30.000Z"
  }
}
```

---

## 比赛接口

### 更新比赛数据

**POST** `/api/submit/update`

实时保存比赛数据（防抖保存）。

**请求参数：**

```json
{
  "match_id": "比赛ID",
  "score_a": 16,
  "score_b": 10,
  "player_stats": [
    {
      "player_id": "玩家ID",
      "kills": 20,
      "deaths": 15,
      "assists": 5
    }
  ]
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "数据已保存",
  "data": null
}
```

### 提交比赛结果

**POST** `/api/submit/finish`

提交最终比赛结果并计算 ELO。

**请求参数：**

```json
{
  "match_id": "比赛ID",
  "score_a": 16,
  "score_b": 10,
  "player_stats": [...]
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "提交成功",
  "data": {
    "elo_changes": [
      {
        "player_id": "ID",
        "nickname": "昵称",
        "old_elo": 1000,
        "new_elo": 1025,
        "elo_change": 25
      }
    ]
  }
}
```

### 获取比赛信息

**GET** `/api/submit/:roomId`

获取指定房间的比赛信息。

**响应示例：**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "_id": "比赛ID",
    "room_id": "房间ID",
    "date": "2024-01-01T00:00:00.000Z",
    "map": "dust2",
    "teamA": ["player_id1", "player_id2"],
    "teamB": ["player_id3", "player_id4"],
    "score_a": 0,
    "score_b": 0,
    "status": "playing",
    "player_stats": []
  }
}
```

---

## 历史记录接口

### 获取玩家历史战绩

**GET** `/api/history/player/:playerId`

获取玩家最近 20 场比赛记录。

**响应示例：**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "_id": "统计ID",
      "match_id": "比赛ID",
      "player_id": "玩家ID",
      "team": "A",
      "kills": 20,
      "deaths": 15,
      "assists": 5,
      "kd_ratio": 1.33,
      "elo_before": 1000,
      "elo_after": 1025,
      "elo_change": 25,
      "match_date": "2024-01-01T00:00:00.000Z",
      "match_map": "dust2",
      "match_winner": "A",
      "score_a": 16,
      "score_b": 10
    }
  ]
}
```

### 获取排行榜

**GET** `/api/history/ranking`

获取前 50 名玩家排行榜。

**响应示例：**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "rank": 1,
      "player_id": "玩家ID",
      "nickname": "昵称",
      "elo": 1500,
      "total_matches": 100,
      "wins": 60,
      "losses": 40,
      "win_rate": 60,
      "kd_ratio": "1.25"
    }
  ]
}
```

### 获取玩家信息

**GET** `/api/history/player-info/:playerId`

获取玩家详细信息。

**响应示例：**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "_id": "玩家ID",
    "nickname": "昵称",
    "steam_id": "Steam ID",
    "elo": 1200,
    "total_matches": 50,
    "wins": 30,
    "losses": 20,
    "total_kills": 1000,
    "total_deaths": 800,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 错误处理

### 错误响应示例

```json
{
  "code": 1001,
  "message": "昵称已存在",
  "data": null
}
```

### 常见错误

| 错误码 | 说明 | 解决方法 |
|--------|------|----------|
| 1001 | 参数错误 | 检查请求参数 |
| 1002 | 玩家不存在 | 确认玩家ID正确 |
| 1003 | 资源不存在 | 确认资源ID正确 |
| 1005 | 状态错误 | 检查当前状态是否满足操作条件 |
| 1006 | 权限不足 | 确认是否有操作权限 |
| 9999 | 服务器错误 | 联系管理员 |

---

## 数据模型

### Player（玩家）

```javascript
{
  _id: ObjectId,
  nickname: String,
  steam_id: String?,
  avatar: String?,
  elo: Number,
  total_matches: Number,
  wins: Number,
  losses: Number,
  total_kills: Number,
  total_deaths: Number,
  created_at: Date,
  updated_at: Date
}
```

### Room（房间）

```javascript
{
  _id: ObjectId,
  status: String, // waiting|ready|matching|bp|playing|finished
  players: [{
    player_id: String,
    nickname: String,
    elo: Number,
    ready: Boolean,
    team: String?
  }],
  teamA: [String],
  teamB: [String],
  elo_diff: Number,
  bp_id: String?,
  created_at: Date,
  updated_at: Date
}
```

### BP_Record（BP记录）

```javascript
{
  _id: ObjectId,
  room_id: String,
  maps: [String],
  available_maps: [String],
  bp_history: [{
    team: String,
    action: String, // ban|pick
    map: String,
    timestamp: Date
  }],
  final_map: String?,
  status: String, // in_progress|completed
  current_step: Number,
  current_votes: Object,
  created_at: Date
}
```

### Match（比赛）

```javascript
{
  _id: ObjectId,
  room_id: String,
  date: Date,
  map: String,
  teamA: [String],
  teamB: [String],
  score_a: Number,
  score_b: Number,
  winner: String?, // A|B|draw
  mvp_id: String?,
  status: String, // playing|finished
  player_stats: [Object],
  created_at: Date,
  finished_at: Date?
}
```

---

## 使用示例

### JavaScript (Fetch API)

```javascript
// 登录
const login = async (nickname) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nickname })
  });
  
  const data = await response.json();
  return data;
};

// 使用
const result = await login('玩家昵称');
if (result.code === 0) {
  console.log('登录成功', result.data);
}
```

### cURL

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"玩家昵称"}'

# 获取排行榜
curl http://localhost:3000/api/history/ranking
```

---

## 注意事项

1. **并发控制**：多人同时操作时使用乐观锁机制
2. **数据同步**：前端应定期轮询获取最新状态
3. **投票机制**：BP 投票需要队伍半数以上同意
4. **防抖保存**：比赛数据更新使用 1 秒防抖
5. **错误处理**：始终检查返回的 code 字段

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本
- 实现所有核心功能
- 支持完整的比赛流程

