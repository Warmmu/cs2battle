# 实时同步功能更新说明

## 更新日期
2024年

## 修复的问题

### 问题1: BP历史显示错误 ✅

**问题描述：**
BP历史记录中，不同队伍ban的地图都显示为第一张被ban的地图名称。

**原因：**
WXML模板中的`wx:for`变量名使用了默认的`item`，导致在嵌套循环或某些情况下变量引用混乱。

**解决方案：**
- 使用`wx:for-item="record"`明确指定循环变量名
- 避免默认的`item`变量名冲突
- 优化票数显示逻辑

**修改文件：**
- `miniprogram/pages/bp/index.wxml`

---

### 问题2: 比赛结果录入应该共享 ✅

**问题描述：**
每个玩家的比赛结果录入是独立的，无法看到其他玩家输入的数据。这不合理，因为大家在同一场比赛中，应该共同录入数据。

**需求：**
- 所有玩家看到相同的比分和KDA数据
- 任何人输入数据，其他人都能实时看到
- 协同录入，最后一起提交

**解决方案：**

#### 1. 实时保存机制（防抖）

```javascript
// 任何数据输入后1秒自动保存到数据库
saveMatchData() {
  clearTimeout(this.saveTimer)
  this.saveTimer = setTimeout(async () => {
    await wx.cloud.callFunction({
      name: 'submit',
      data: {
        action: 'updateData',  // 实时更新，不提交
        match_id: match_id,
        score_a: scoreA,
        score_b: scoreB,
        player_stats: playerStats
      }
    })
  }, 1000)
}
```

#### 2. 实时同步机制（轮询）

```javascript
// 每2秒从数据库获取最新数据
async getMatchStatus() {
  const match = await db.collection('matches').doc(match_id).get()
  
  // 同步比分
  this.setData({
    scoreA: match.score_a,
    scoreB: match.score_b
  })
  
  // 同步所有玩家的KDA数据
  // 更新teamAPlayers和teamBPlayers
}
```

#### 3. 数据结构优化

**原来的问题：**
```javascript
teamAPlayers = [{
  player_id: 'xxx',
  nickname: 'liuli'
  // 没有KDA数据
}]
```

**现在的结构：**
```javascript
teamAPlayers = [{
  player_id: 'xxx',
  nickname: 'liuli',
  kills: 25,      // 直接包含KDA
  deaths: 15,
  assists: 5
}]
```

这样WXML可以直接绑定：`value="{{player.kills}}"`

#### 4. 双向同步

**输入时：**
```javascript
onStatInput() {
  // 1. 更新playerStats
  // 2. 更新teamAPlayers/teamBPlayers
  // 3. 触发自动保存
}
```

**轮询时：**
```javascript
getMatchStatus() {
  // 1. 获取数据库最新数据
  // 2. 更新playerStats
  // 3. 更新teamAPlayers/teamBPlayers
}
```

#### 5. UI显示优化

- 页面顶部显示"实时同步中"
- 显示最后同步时间
- 提交后所有人同步跳转

---

## 技术实现

### 云函数修改（submit）

**新增 updateData action：**
```javascript
if (action === 'updateData') {
  // 只更新数据，不计算ELO，不结束比赛
  await db.collection('matches').doc(match_id).update({
    data: {
      score_a: score_a,
      score_b: score_b,
      player_stats: player_stats,
      updated_at: db.serverDate()
    }
  })
  return { code: 0, message: '数据已更新' }
}
```

**原有的提交逻辑不变：**
```javascript
// 默认action（或action为空）执行完整的提交流程
// 计算ELO、更新玩家统计、结束比赛
```

### 前端优化（match页面）

**页面数据结构：**
```javascript
data: {
  scoreA: 0,
  scoreB: 0,
  playerStats: [...],      // 内部使用
  teamAPlayers: [...],     // 包含KDA，用于显示
  teamBPlayers: [...],     // 包含KDA，用于显示
  polling: null,           // 轮询定时器
  lastUpdateTime: ''       // 同步时间
}
```

**页面生命周期：**
```javascript
onLoad() {
  1. 加载比赛信息
  2. 初始化玩家数据
  3. 1秒后启动轮询
}

onUnload() {
  停止轮询
}
```

---

## 数据流程

### 场景：玩家A输入比分

```
1. 玩家A输入A队比分：13
   ↓
2. onScoreAChange触发
   ↓
3. setData更新本地显示
   ↓
4. 调用saveMatchData()
   ↓
5. 1秒后自动保存到数据库
   ↓
6. 玩家B的轮询（2秒内）检测到更新
   ↓
7. getMatchStatus获取最新数据
   ↓
8. 玩家B的页面显示 scoreA = 13
   ↓
9. 玩家B看到同步时间更新
```

### 场景：玩家B输入KDA

```
1. 玩家B输入玩家1的K：25
   ↓
2. onStatInput触发
   ↓
3. 更新playerStats[0].kills = 25
4. 更新teamAPlayers[0].kills = 25
   ↓
5. setData更新本地显示
   ↓
6. 调用saveMatchData()
   ↓
7. 1秒后自动保存到数据库
   ↓
8. 玩家A的轮询检测到更新
   ↓
9. 玩家A看到玩家1的K变成25
```

---

## 性能优化

### 1. 防抖机制
- 快速输入时不会立即保存
- 1秒内的多次输入只保存一次
- 减少云函数调用次数

### 2. 增量更新
- 只更新changed的数据
- 不重复保存相同数据

### 3. 智能轮询
- 只在playing状态轮询
- 提交后自动停止
- 页面卸载时清理

---

## 测试场景

### 测试1: 实时同步比分
**步骤：**
1. 玩家A和玩家B同时进入比赛录入页面
2. 玩家A输入A队比分：13
3. 等待2秒，观察玩家B的页面

**预期：**
- ✅ 玩家B看到A队比分变为13
- ✅ 同步时间显示更新

### 测试2: 实时同步KDA
**步骤：**
1. 玩家A输入玩家1的K：25, D：15
2. 等待2秒，观察玩家B的页面
3. 玩家B输入玩家2的K：18, D：20
4. 等待2秒，观察玩家A的页面

**预期：**
- ✅ 玩家B看到玩家1的KDA
- ✅ 玩家A看到玩家2的KDA
- ✅ 输入框显示同步后的值

### 测试3: 协同录入
**步骤：**
1. 玩家A录入比分
2. 玩家B录入A队玩家KDA
3. 玩家A录入B队玩家KDA
4. 任意一人点击"提交结果"

**预期：**
- ✅ 所有数据都能同步
- ✅ 提交后两人都跳转到大厅
- ✅ ELO正确计算

---

## 部署说明

**需要部署的云函数：**
```bash
cloudfunctions/submit/  # 添加了updateData功能
```

**部署步骤：**
1. 右键 `cloudfunctions/submit` 目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

---

## 数据库字段说明

### matches 集合新增字段

```javascript
{
  score_a: 0,           // A队比分（实时更新）
  score_b: 0,           // B队比分（实时更新）
  player_stats: [       // 玩家数据（实时更新）
    {
      player_id: 'xxx',
      kills: 25,
      deaths: 15,
      assists: 5
    },
    // ...
  ],
  status: 'playing',    // playing: 进行中, finished: 已提交
  updated_at: Date      // 每次更新时间
}
```

---

## UI改进

### 比赛录入页面

**顶部显示：**
```
┌─────────────────────────┐
│   录入比赛结果           │
│   地图: dust2           │
│ [实时同步中]   14:35:23  │
└─────────────────────────┘
```

### BP页面

**顶部调试信息：**
```
┌─────────────────────────┐
│   地图 Ban/Pick         │
│   您在 A 队             │
│   B队 Ban 地图          │
│ Step:1|轮询正常|B队Ban   │
│ 可选:5      14:35:23    │
└─────────────────────────┘
```

---

## 已知问题与限制

1. **轮询延迟**：最多2秒延迟
2. **网络依赖**：需要网络连接才能同步
3. **并发冲突**：理论上可能有极小概率的数据覆盖

---

## 未来优化建议

1. **WebSocket推送**：代替轮询，实现真正的实时同步
2. **乐观更新**：先更新UI，再同步数据库
3. **冲突解决**：添加版本号或时间戳解决并发冲突
4. **离线支持**：支持离线录入，联网后同步
5. **输入验证**：限制输入范围，防止异常数据

