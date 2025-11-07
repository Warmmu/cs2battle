# 测试模式配置指南

## 当前配置

已启用 **2 人测试模式**，只需 2 个微信账号即可测试完整流程。

---

## 如果需要 1 人测试模式

### 修改步骤

#### 1. 修改 `cloudfunctions/room/index.js`

```javascript
// 检查是否所有人都准备好了（单人测试模式）
const allReady = room.players.length >= 1 && room.players.every(p => p.ready)
```

#### 2. 修改 `cloudfunctions/match/index.js`

```javascript
if (room.players.length < 1) {
  return { code: 1001, message: '玩家数量不足（单人测试模式）', data: null }
}
```

#### 3. 修改 `miniprogram/pages/lobby/index.wxml`

```xml
<text wx:if="{{room.players.length < 1}}">
  单人测试模式
</text>
```

#### 4. 重新部署云函数

- 右键 `room` 和 `match` 云函数
- 选择"上传并部署：不安装依赖"

---

## 恢复正式模式（4 人）

上线前记得改回：

```javascript
// 恢复为 4 人模式
const allReady = room.players.length >= 4 && room.players.every(p => p.ready)
```

```javascript
if (room.players.length < 4) {
  return { code: 1001, message: '玩家数量不足（至少4人）', data: null }
}
```

---

## 不同模式对比

| 模式 | 最小人数 | 适用场景 |
|------|---------|---------|
| 1 人模式 | 1 | 完全单人测试（会分成 1v0） |
| 2 人模式 ✅ | 2 | 双人测试（1v1） |
| 4 人模式 | 4 | 正式环境（2v2） |
| 10 人模式 | 10 | 大型比赛（5v5） |

---

## 注意事项

### 1 人模式的限制

- 分队会变成 1v0（一个队伍空的）
- BP 可以正常进行
- 比赛结果录入可能需要手动填写另一队的数据

### 推荐测试配置

- **开发阶段**：2 人模式（当前配置）✅
- **联调测试**：4 人模式
- **正式上线**：4 人或更多

---

## 快速切换命令

在 `cloudfunctions/room/index.js` 第 136 行和 `cloudfunctions/match/index.js` 第 24 行：

```javascript
// 单人测试
const allReady = room.players.length >= 1 && ...
if (room.players.length < 1) ...

// 双人测试（当前）✅
const allReady = room.players.length >= 2 && ...
if (room.players.length < 2) ...

// 正式模式
const allReady = room.players.length >= 4 && ...
if (room.players.length < 4) ...
```

修改后记得**重新部署云函数**！

