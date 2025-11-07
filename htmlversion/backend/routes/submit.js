// 比赛结果提交路由
const express = require('express');
const router = express.Router();
const { getCollection, ObjectId } = require('../db');

// 更新比赛数据（实时保存）
router.post('/update', async (req, res) => {
  try {
    const { match_id, score_a, score_b, player_stats } = req.body;
    
    const matches = getCollection('matches');
    
    await matches.updateOne(
      { _id: new ObjectId(match_id) },
      {
        $set: {
          score_a: score_a || 0,
          score_b: score_b || 0,
          player_stats: player_stats || [],
          updated_at: new Date()
        }
      }
    );
    
    res.json({
      code: 0,
      message: '数据已保存',
      data: null
    });
  } catch (err) {
    console.error('更新比赛数据失败:', err);
    res.json({
      code: 9999,
      message: '更新失败：' + err.message,
      data: null
    });
  }
});

// 提交比赛结果（完成比赛）
router.post('/finish', async (req, res) => {
  try {
    const { match_id, score_a, score_b, player_stats } = req.body;
    
    // 验证数据
    if (score_a === 0 && score_b === 0) {
      return res.json({ code: 1001, message: '请输入比分', data: null });
    }
    
    const incomplete = player_stats.some(p => !p.kills && !p.deaths);
    if (incomplete) {
      return res.json({ code: 1001, message: '请填写所有玩家数据', data: null });
    }
    
    const matches = getCollection('matches');
    const players = getCollection('players');
    const playerStatsCol = getCollection('player_stats');
    const eloHistory = getCollection('elo_history');
    
    // 获取比赛信息
    const match = await matches.findOne({ _id: new ObjectId(match_id) });
    if (!match) {
      return res.json({ code: 1003, message: '比赛不存在', data: null });
    }
    
    // 判断胜者
    const winner = score_a > score_b ? 'A' : (score_b > score_a ? 'B' : 'draw');
    
    // 计算 ELO 变化
    const eloChanges = await calculateELO(match, score_a, score_b, player_stats, winner);
    
    // 更新比赛状态
    await matches.updateOne(
      { _id: new ObjectId(match_id) },
      {
        $set: {
          score_a,
          score_b,
          winner,
          status: 'finished',
          finished_at: new Date(),
          player_stats
        }
      }
    );
    
    // 保存玩家统计数据
    for (const stat of player_stats) {
      const eloChange = eloChanges.find(e => e.player_id === stat.player_id);
      
      await playerStatsCol.insertOne({
        match_id: match_id,
        player_id: stat.player_id,
        team: match.teamA.includes(stat.player_id) ? 'A' : 'B',
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists || 0,
        kd_ratio: stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills,
        elo_before: eloChange.old_elo,
        elo_after: eloChange.new_elo,
        elo_change: eloChange.elo_change,
        created_at: new Date()
      });
    }
    
    // 更新玩家 ELO 和统计
    for (const change of eloChanges) {
      const stat = player_stats.find(s => s.player_id === change.player_id);
      const isWinner = (winner === 'A' && match.teamA.includes(change.player_id)) ||
                      (winner === 'B' && match.teamB.includes(change.player_id));
      
      await players.updateOne(
        { _id: new ObjectId(change.player_id) },
        {
          $set: { elo: change.new_elo, updated_at: new Date() },
          $inc: {
            total_matches: 1,
            wins: isWinner && winner !== 'draw' ? 1 : 0,
            losses: !isWinner && winner !== 'draw' ? 1 : 0,
            total_kills: stat.kills,
            total_deaths: stat.deaths
          }
        }
      );
      
      // 记录 ELO 历史
      await eloHistory.insertOne({
        player_id: change.player_id,
        match_id: match_id,
        elo_before: change.old_elo,
        elo_after: change.new_elo,
        elo_change: change.elo_change,
        reason: isWinner ? 'win' : (winner === 'draw' ? 'draw' : 'loss'),
        created_at: new Date()
      });
    }
    
    // 更新房间状态
    const rooms = getCollection('rooms');
    await rooms.updateOne(
      { _id: new ObjectId(match.room_id) },
      { $set: { status: 'finished', updated_at: new Date() } }
    );
    
    res.json({
      code: 0,
      message: '提交成功',
      data: { elo_changes: eloChanges }
    });
  } catch (err) {
    console.error('提交比赛结果失败:', err);
    res.json({
      code: 9999,
      message: '提交失败：' + err.message,
      data: null
    });
  }
});

// 获取比赛信息
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const matches = getCollection('matches');
    const match = await matches.findOne({
      room_id: roomId,
      status: 'playing'
    });
    
    if (!match) {
      return res.json({ code: 1003, message: '比赛不存在', data: null });
    }
    
    match._id = match._id.toString();
    
    res.json({
      code: 0,
      message: '获取成功',
      data: match
    });
  } catch (err) {
    console.error('获取比赛信息失败:', err);
    res.json({
      code: 9999,
      message: '获取失败：' + err.message,
      data: null
    });
  }
});

/**
 * 计算 ELO 变化
 */
async function calculateELO(match, scoreA, scoreB, playerStats, winner) {
  const players = getCollection('players');
  const changes = [];
  
  // 获取所有玩家信息
  const playerIds = [...match.teamA, ...match.teamB].map(id => new ObjectId(id));
  const playerDocs = await players.find({ _id: { $in: playerIds } }).toArray();
  
  // 计算队伍平均 ELO
  const teamAPlayers = playerDocs.filter(p => match.teamA.includes(p._id.toString()));
  const teamBPlayers = playerDocs.filter(p => match.teamB.includes(p._id.toString()));
  
  const avgEloA = teamAPlayers.reduce((sum, p) => sum + p.elo, 0) / teamAPlayers.length;
  const avgEloB = teamBPlayers.reduce((sum, p) => sum + p.elo, 0) / teamBPlayers.length;
  
  // 计算期望胜率
  const expectedA = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400));
  const expectedB = 1 - expectedA;
  
  // 实际得分
  const actualA = winner === 'A' ? 1 : (winner === 'draw' ? 0.5 : 0);
  const actualB = 1 - actualA;
  
  // 计算每个玩家的 ELO 变化
  for (const playerDoc of playerDocs) {
    const playerId = playerDoc._id.toString();
    const stat = playerStats.find(s => s.player_id === playerId);
    const isTeamA = match.teamA.includes(playerId);
    
    // K 因子
    let K = 32;
    if (playerDoc.elo < 1200) K = 40;
    else if (playerDoc.elo > 1800) K = 24;
    
    // 基础 ELO 变化
    const expected = isTeamA ? expectedA : expectedB;
    const actual = isTeamA ? actualA : actualB;
    let eloChange = K * (actual - expected);
    
    // KD 修正
    if (stat) {
      const kd = stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills;
      if (kd > 1.5) {
        eloChange *= 1.2;
      } else if (kd < 0.8) {
        eloChange *= 0.8;
      }
    }
    
    eloChange = Math.round(eloChange);
    const newElo = Math.max(0, playerDoc.elo + eloChange);
    
    changes.push({
      player_id: playerId,
      nickname: playerDoc.nickname,
      old_elo: playerDoc.elo,
      new_elo: newElo,
      elo_change: eloChange
    });
  }
  
  return changes;
}

module.exports = router;

