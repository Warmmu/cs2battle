# CS2 内战匹配系统 - 云函数 API 文档

## 云函数列表

### 1. register - 玩家注册

**请求参数**
```json
{
  "action": "register",
  "nickname": "玩家昵称",
  "steam_id": "Steam ID (可选)",
  "avatar": "头像URL (可选)"
}
```

**返回结果**
```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "player_id": "xxx",
    "nickname": "玩家昵称",
    "elo": 1000
  }
}
```

---

### 2. room - 房间管理

#### 2.1 创建/加入房间
```json
{
  "action": "join",
  "player_id": "玩家ID"
}
```

#### 2.2 准备/取消准备
```json
{
  "action": "ready",
  "player_id": "玩家ID",
  "ready": true
}
```

#### 2.3 获取房间状态
```json
{
  "action": "getRoomStatus",
  "room_id": "房间ID"
}
```

#### 2.4 离开房间
```json
{
  "action": "leave",
  "player_id": "玩家ID",
  "room_id": "房间ID"
}
```

---

### 3. match - 匹配分队

**请求参数**
```json
{
  "action": "startMatch",
  "room_id": "房间ID"
}
```

**返回结果**
```json
{
  "code": 0,
  "message": "匹配成功",
  "data": {
    "teamA": [
      {"player_id": "xxx", "nickname": "玩家1", "elo": 1200}
    ],
    "teamB": [
      {"player_id": "yyy", "nickname": "玩家2", "elo": 1180}
    ],
    "elo_diff": 20
  }
}
```

---

### 4. bp - 地图 Ban/Pick

#### 4.1 开始 BP
```json
{
  "action": "startBP",
  "room_id": "房间ID"
}
```

#### 4.2 执行 BP 操作
```json
{
  "action": "doBP",
  "room_id": "房间ID",
  "bp_id": "BP记录ID",
  "team": "A|B",
  "map": "地图名",
  "bp_action": "ban|pick"
}
```

#### 4.3 获取 BP 状态
```json
{
  "action": "getBPStatus",
  "bp_id": "BP记录ID"
}
```

---

### 5. submit - 提交比赛结果

**请求参数**
```json
{
  "action": "submitResult",
  "match_id": "比赛ID",
  "score_a": 13,
  "score_b": 11,
  "player_stats": [
    {
      "player_id": "xxx",
      "kills": 22,
      "deaths": 14,
      "assists": 5
    }
  ]
}
```

**返回结果**
```json
{
  "code": 0,
  "message": "提交成功",
  "data": {
    "match_id": "xxx",
    "elo_changes": [
      {
        "player_id": "xxx",
        "elo_change": 25,
        "new_elo": 1225
      }
    ]
  }
}
```

---

### 6. history - 历史记录

#### 6.1 获取玩家历史
```json
{
  "action": "getPlayerHistory",
  "player_id": "玩家ID",
  "page": 1,
  "limit": 10
}
```

#### 6.2 获取比赛详情
```json
{
  "action": "getMatchDetail",
  "match_id": "比赛ID"
}
```

#### 6.3 获取排行榜
```json
{
  "action": "getRanking",
  "limit": 50
}
```

---

### 7. player - 玩家信息

#### 7.1 获取玩家信息
```json
{
  "action": "getPlayerInfo",
  "player_id": "玩家ID"
}
```

#### 7.2 更新玩家信息
```json
{
  "action": "updatePlayerInfo",
  "player_id": "玩家ID",
  "nickname": "新昵称",
  "avatar": "新头像URL"
}
```

---

## ELO 计算公式

```javascript
// 期望胜率
P = 1 / (1 + 10 ^ ((对方平均ELO - 己方平均ELO) / 400))

// ELO 变化
ΔElo = K × (实际得分 - 期望得分)

// K 因子
K = 32 (基础)
K = 40 (ELO < 1200)
K = 24 (ELO > 1800)

// 实际得分
胜利 = 1
平局 = 0.5
失败 = 0
```

## 错误码

- `0`: 成功
- `1001`: 参数错误
- `1002`: 玩家不存在
- `1003`: 房间不存在
- `1004`: 权限不足
- `1005`: 状态错误
- `9999`: 服务器错误

