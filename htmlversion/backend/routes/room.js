// 房间管理路由
const express = require('express');
const router = express.Router();
const { getCollection, ObjectId } = require('../db');

// 加入房间
router.post('/join', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.json({ code: 1001, message: '缺少玩家ID', data: null });
    }
    
    const players = getCollection('players');
    const rooms = getCollection('rooms');
    
    // 获取玩家信息
    const player = await players.findOne({ _id: new ObjectId(player_id) });
    if (!player) {
      return res.json({ code: 1002, message: '玩家不存在', data: null });
    }
    
    // 查找可用房间（状态为 waiting 且人数未满）
    const availableRooms = await rooms.find({ status: 'waiting' }).toArray();
    let room = availableRooms.find(r => r.players.length < 10);
    
    if (room) {
      // 检查玩家是否已在房间中
      const playerExists = room.players.some(p => p.player_id === player_id);
      if (playerExists) {
        return res.json({ code: 0, message: '已在房间中', data: room });
      }
      
      // 加入现有房间
      await rooms.updateOne(
        { _id: room._id },
        {
          $push: {
            players: {
              player_id: player_id,
              nickname: player.nickname,
              elo: player.elo,
              ready: false,
              team: null
            }
          },
          $set: { updated_at: new Date() }
        }
      );
      
      // 获取更新后的房间
      room = await rooms.findOne({ _id: room._id });
    } else {
      // 创建新房间
      const newRoom = {
        status: 'waiting',
        players: [{
          player_id: player_id,
          nickname: player.nickname,
          elo: player.elo,
          ready: false,
          team: null
        }],
        teamA: [],
        teamB: [],
        elo_diff: 0,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await rooms.insertOne(newRoom);
      room = await rooms.findOne({ _id: result.insertedId });
    }
    
    // 转换 _id 为字符串
    room._id = room._id.toString();
    
    res.json({
      code: 0,
      message: '加入房间成功',
      data: room
    });
  } catch (err) {
    console.error('加入房间失败:', err);
    res.json({
      code: 9999,
      message: '加入房间失败：' + err.message,
      data: null
    });
  }
});

// 设置准备状态
router.post('/ready', async (req, res) => {
  try {
    const { player_id, room_id, ready } = req.body;
    
    const rooms = getCollection('rooms');
    const room = await rooms.findOne({ _id: new ObjectId(room_id) });
    
    if (!room) {
      return res.json({ code: 1003, message: '房间不存在', data: null });
    }
    
    const playerIndex = room.players.findIndex(p => p.player_id === player_id);
    if (playerIndex === -1) {
      return res.json({ code: 1002, message: '玩家不在房间中', data: null });
    }
    
    // 更新玩家准备状态
    room.players[playerIndex].ready = ready;
    
    // 检查是否所有人都准备好了（至少需要2人）
    const allReady = room.players.length >= 2 && room.players.every(p => p.ready);
    
    await rooms.updateOne(
      { _id: new ObjectId(room_id) },
      {
        $set: {
          players: room.players,
          status: allReady ? 'ready' : 'waiting',
          updated_at: new Date()
        }
      }
    );
    
    res.json({
      code: 0,
      message: ready ? '已准备' : '取消准备',
      data: {
        ready: ready,
        all_ready: allReady
      }
    });
  } catch (err) {
    console.error('设置准备状态失败:', err);
    res.json({
      code: 9999,
      message: '操作失败：' + err.message,
      data: null
    });
  }
});

// 获取房间状态
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const rooms = getCollection('rooms');
    const room = await rooms.findOne({ _id: new ObjectId(roomId) });
    
    if (!room) {
      return res.json({ code: 1003, message: '房间不存在', data: null });
    }
    
    // 转换 _id 为字符串
    room._id = room._id.toString();
    
    res.json({
      code: 0,
      message: '获取成功',
      data: room
    });
  } catch (err) {
    console.error('获取房间状态失败:', err);
    res.json({
      code: 9999,
      message: '获取失败：' + err.message,
      data: null
    });
  }
});

// 获取可用房间列表
router.get('/', async (req, res) => {
  try {
    const rooms = getCollection('rooms');
    const availableRooms = await rooms
      .find({ status: { $in: ['waiting', 'ready'] } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();
    
    const roomList = availableRooms.map(room => ({
      _id: room._id.toString(),
      player_count: room.players.length,
      status: room.status,
      created_at: room.created_at
    }));
    
    res.json({
      code: 0,
      message: '获取成功',
      data: roomList
    });
  } catch (err) {
    console.error('获取房间列表失败:', err);
    res.json({
      code: 9999,
      message: '获取失败：' + err.message,
      data: []
    });
  }
});

// 离开房间
router.post('/leave', async (req, res) => {
  try {
    const { player_id, room_id } = req.body;
    
    const rooms = getCollection('rooms');
    const room = await rooms.findOne({ _id: new ObjectId(room_id) });
    
    if (!room) {
      return res.json({ code: 1003, message: '房间不存在', data: null });
    }
    
    const newPlayers = room.players.filter(p => p.player_id !== player_id);
    
    if (newPlayers.length === 0) {
      // 房间无人，删除房间
      await rooms.deleteOne({ _id: new ObjectId(room_id) });
    } else {
      // 更新玩家列表
      await rooms.updateOne(
        { _id: new ObjectId(room_id) },
        {
          $set: {
            players: newPlayers,
            status: 'waiting',
            updated_at: new Date()
          }
        }
      );
    }
    
    res.json({
      code: 0,
      message: '已离开房间',
      data: null
    });
  } catch (err) {
    console.error('离开房间失败:', err);
    res.json({
      code: 9999,
      message: '操作失败：' + err.message,
      data: null
    });
  }
});

module.exports = router;

