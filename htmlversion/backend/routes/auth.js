// 认证路由 - 登录和注册
const express = require('express');
const router = express.Router();
const { getCollection, ObjectId } = require('../db');

// 玩家注册
router.post('/register', async (req, res) => {
  try {
    const { nickname, steam_id, avatar } = req.body;
    
    if (!nickname || !nickname.trim()) {
      return res.json({
        code: 1001,
        message: '昵称不能为空',
        data: null
      });
    }
    
    const players = getCollection('players');
    
    // 检查昵称是否已存在
    const existingPlayer = await players.findOne({ nickname: nickname.trim() });
    if (existingPlayer) {
      return res.json({
        code: 1001,
        message: '昵称已存在',
        data: null
      });
    }
    
    // 创建新玩家
    const newPlayer = {
      nickname: nickname.trim(),
      steam_id: steam_id || null,
      avatar: avatar || null,
      elo: 1000,
      total_matches: 0,
      wins: 0,
      losses: 0,
      total_kills: 0,
      total_deaths: 0,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await players.insertOne(newPlayer);
    
    res.json({
      code: 0,
      message: '注册成功',
      data: {
        player_id: result.insertedId.toString(),
        nickname: newPlayer.nickname,
        elo: newPlayer.elo
      }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.json({
      code: 9999,
      message: '注册失败：' + err.message,
      data: null
    });
  }
});

// 玩家登录
router.post('/login', async (req, res) => {
  try {
    const { nickname } = req.body;
    
    if (!nickname || !nickname.trim()) {
      return res.json({
        code: 1001,
        message: '昵称不能为空',
        data: null
      });
    }
    
    const players = getCollection('players');
    
    // 查找玩家
    const player = await players.findOne({ nickname: nickname.trim() });
    
    if (!player) {
      return res.json({
        code: 1001,
        message: '该昵称未注册，请先注册',
        data: null
      });
    }
    
    res.json({
      code: 0,
      message: '登录成功',
      data: {
        player_id: player._id.toString(),
        nickname: player.nickname,
        elo: player.elo,
        total_matches: player.total_matches,
        wins: player.wins,
        losses: player.losses
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.json({
      code: 9999,
      message: '登录失败：' + err.message,
      data: null
    });
  }
});

module.exports = router;

