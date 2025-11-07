// 历史记录和排行榜路由
const express = require('express');
const router = express.Router();
const { getCollection, ObjectId } = require('../db');

// 获取玩家历史战绩
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const playerStatsCol = getCollection('player_stats');
    const matches = getCollection('matches');
    
    // 获取玩家所有比赛统计
    const stats = await playerStatsCol
      .find({ player_id: playerId })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();
    
    // 获取对应的比赛信息
    const matchIds = stats.map(s => new ObjectId(s.match_id));
    const matchDocs = await matches
      .find({ _id: { $in: matchIds } })
      .toArray();
    
    // 组合数据
    const history = stats.map(stat => {
      const match = matchDocs.find(m => m._id.toString() === stat.match_id);
      return {
        ...stat,
        _id: stat._id.toString(),
        match_date: match ? match.date : null,
        match_map: match ? match.map : null,
        match_winner: match ? match.winner : null,
        score_a: match ? match.score_a : 0,
        score_b: match ? match.score_b : 0
      };
    });
    
    res.json({
      code: 0,
      message: '获取成功',
      data: history
    });
  } catch (err) {
    console.error('获取历史战绩失败:', err);
    res.json({
      code: 9999,
      message: '获取失败：' + err.message,
      data: []
    });
  }
});

// 获取排行榜
router.get('/ranking', async (req, res) => {
  try {
    const players = getCollection('players');
    
    // 获取前50名玩家
    const ranking = await players
      .find({})
      .sort({ elo: -1 })
      .limit(50)
      .toArray();
    
    const rankingData = ranking.map((player, index) => ({
      rank: index + 1,
      player_id: player._id.toString(),
      nickname: player.nickname,
      elo: player.elo,
      total_matches: player.total_matches,
      wins: player.wins,
      losses: player.losses,
      win_rate: player.total_matches > 0 
        ? Math.round((player.wins / player.total_matches) * 100) 
        : 0,
      kd_ratio: player.total_deaths > 0
        ? (player.total_kills / player.total_deaths).toFixed(2)
        : player.total_kills.toFixed(2)
    }));
    
    res.json({
      code: 0,
      message: '获取成功',
      data: rankingData
    });
  } catch (err) {
    console.error('获取排行榜失败:', err);
    res.json({
      code: 9999,
      message: '获取失败：' + err.message,
      data: []
    });
  }
});

// 获取玩家信息
router.get('/player-info/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const players = getCollection('players');
    const player = await players.findOne({ _id: new ObjectId(playerId) });
    
    if (!player) {
      return res.json({ code: 1002, message: '玩家不存在', data: null });
    }
    
    player._id = player._id.toString();
    
    res.json({
      code: 0,
      message: '获取成功',
      data: player
    });
  } catch (err) {
    console.error('获取玩家信息失败:', err);
    res.json({
      code: 9999,
      message: '获取失败：' + err.message,
      data: null
    });
  }
});

module.exports = router;

