# CS2 内战匹配系统 - 云数据库设计

## 数据库集合

### 1. players (玩家表)
```json
{
  "_id": "自动生成",
  "nickname": "玩家昵称",
  "steam_id": "Steam ID (可选)",
  "elo": 1000,
  "total_matches": 0,
  "wins": 0,
  "losses": 0,
  "total_kills": 0,
  "total_deaths": 0,
  "avatar": "头像URL (可选)",
  "created_at": "注册时间",
  "updated_at": "更新时间"
}
```

### 2. rooms (房间表)
```json
{
  "_id": "自动生成",
  "status": "waiting|ready|matching|bp|playing|finished",
  "players": [
    {
      "player_id": "玩家ID",
      "nickname": "昵称",
      "elo": 1000,
      "ready": false,
      "team": null
    }
  ],
  "teamA": ["player_id1", "player_id2"],
  "teamB": ["player_id3", "player_id4"],
  "elo_diff": 0,
  "created_at": "创建时间",
  "updated_at": "更新时间"
}
```

### 3. bp_records (BP记录表)
```json
{
  "_id": "自动生成",
  "room_id": "房间ID",
  "maps": ["inferno", "mirage", "dust2", "nuke", "overpass", "ancient", "anubis"],
  "bp_history": [
    {
      "team": "A|B",
      "action": "ban|pick",
      "map": "地图名",
      "timestamp": "时间戳"
    }
  ],
  "final_map": "最终地图",
  "status": "in_progress|completed",
  "created_at": "创建时间"
}
```

### 4. matches (比赛表)
```json
{
  "_id": "自动生成",
  "room_id": "房间ID",
  "date": "比赛日期",
  "map": "地图名",
  "teamA": ["player_id1", "player_id2"],
  "teamB": ["player_id3", "player_id4"],
  "score_a": 0,
  "score_b": 0,
  "winner": "A|B|draw",
  "mvp_id": "MVP玩家ID",
  "status": "playing|finished",
  "created_at": "创建时间",
  "finished_at": "结束时间"
}
```

### 5. player_stats (玩家比赛统计)
```json
{
  "_id": "自动生成",
  "match_id": "比赛ID",
  "player_id": "玩家ID",
  "team": "A|B",
  "kills": 0,
  "deaths": 0,
  "assists": 0,
  "kd_ratio": 0,
  "rating": 0,
  "elo_before": 1000,
  "elo_after": 1000,
  "elo_change": 0,
  "created_at": "创建时间"
}
```

### 6. elo_history (ELO历史记录)
```json
{
  "_id": "自动生成",
  "player_id": "玩家ID",
  "match_id": "比赛ID",
  "elo_before": 1000,
  "elo_after": 1020,
  "elo_change": 20,
  "reason": "win|loss|draw",
  "created_at": "创建时间"
}
```

## 索引建议

### players 集合
- `nickname`: 普通索引
- `elo`: 降序索引（用于排行榜）
- `created_at`: 降序索引

### matches 集合
- `date`: 降序索引
- `teamA`: 普通索引
- `teamB`: 普通索引
- `status`: 普通索引

### player_stats 集合
- `match_id`: 普通索引
- `player_id`: 普通索引
- 组合索引：`player_id` + `created_at`

## 数据库权限设置

建议在云开发控制台设置以下权限：
- 所有集合：仅创建者及管理员可写
- 读取权限：所有用户可读

