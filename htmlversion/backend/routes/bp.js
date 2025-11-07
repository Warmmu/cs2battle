// BP (Ban/Pick) 路由
const express = require('express');
const router = express.Router();
const { getCollection, ObjectId } = require('../db');

// CS2 官方地图池
const MAP_POOL = ['inferno', 'mirage', 'dust2', 'nuke', 'overpass', 'ancient', 'anubis'];

// 开始 BP
router.post('/start', async (req, res) => {
  try {
    const { room_id } = req.body;
    
    const rooms = getCollection('rooms');
    const bpRecords = getCollection('bp_records');
    
    const room = await rooms.findOne({ _id: new ObjectId(room_id) });
    if (!room) {
      return res.json({ code: 1003, message: '房间不存在', data: null });
    }
    
    // 如果房间已经有BP记录，直接返回现有的
    if (room.bp_id) {
      const bp = await bpRecords.findOne({ _id: new ObjectId(room.bp_id) });
      if (bp) {
        return res.json({
          code: 0,
          message: 'BP 已存在',
          data: {
            bp_id: room.bp_id,
            maps: MAP_POOL,
            next_action: getBPAction(bp.current_step)
          }
        });
      }
    }
    
    if (room.status !== 'matching') {
      return res.json({ code: 1005, message: '房间状态错误，需先完成匹配', data: null });
    }
    
    // 创建 BP 记录
    const newBP = {
      room_id: room_id,
      maps: [...MAP_POOL],
      available_maps: [...MAP_POOL],
      bp_history: [],
      final_map: null,
      status: 'in_progress',
      current_step: 0,
      current_votes: {},
      created_at: new Date()
    };
    
    const result = await bpRecords.insertOne(newBP);
    
    // 更新房间状态
    await rooms.updateOne(
      { _id: new ObjectId(room_id) },
      {
        $set: {
          status: 'bp',
          bp_id: result.insertedId.toString(),
          updated_at: new Date()
        }
      }
    );
    
    res.json({
      code: 0,
      message: 'BP 开始',
      data: {
        bp_id: result.insertedId.toString(),
        maps: MAP_POOL,
        next_action: getBPAction(0)
      }
    });
  } catch (err) {
    console.error('BP开始失败:', err);
    res.json({
      code: 9999,
      message: 'BP开始失败：' + err.message,
      data: null
    });
  }
});

// BP 投票
router.post('/vote', async (req, res) => {
  try {
    const { bp_id, team, map, bp_action, player_id } = req.body;
    
    const bpRecords = getCollection('bp_records');
    const rooms = getCollection('rooms');
    const matches = getCollection('matches');
    
    const bp = await bpRecords.findOne({ _id: new ObjectId(bp_id) });
    if (!bp) {
      return res.json({ code: 1003, message: 'BP 记录不存在', data: null });
    }
    
    if (bp.status === 'completed') {
      return res.json({ code: 1005, message: 'BP 已完成', data: null });
    }
    
    // 验证地图是否可用
    if (!bp.available_maps.includes(map)) {
      return res.json({ code: 1001, message: '地图不可用', data: null });
    }
    
    // 验证操作是否正确
    const expectedAction = getBPAction(bp.current_step);
    if (expectedAction.team !== team || expectedAction.action !== bp_action) {
      return res.json({
        code: 1005,
        message: `当前应该是 ${expectedAction.team} 队 ${expectedAction.action === 'ban' ? 'Ban' : 'Pick'}`,
        data: null
      });
    }
    
    // 获取房间信息，验证玩家权限
    const room = await rooms.findOne({ _id: new ObjectId(bp.room_id) });
    const teamPlayers = team === 'A' ? room.teamA : room.teamB;
    
    if (!teamPlayers.includes(player_id)) {
      return res.json({
        code: 1006,
        message: '您不在当前操作的队伍中',
        data: null
      });
    }
    
    // 投票机制
    const currentVotes = bp.current_votes || {};
    currentVotes[player_id] = map;
    
    // 统计投票结果
    const voteCounts = {};
    Object.values(currentVotes).forEach(m => {
      voteCounts[m] = (voteCounts[m] || 0) + 1;
    });
    
    // 计算需要的票数（队伍人数的一半以上）
    const requiredVotes = Math.ceil(teamPlayers.length / 2);
    const maxVotes = Math.max(...Object.values(voteCounts));
    const selectedMap = Object.keys(voteCounts).find(m => voteCounts[m] === maxVotes);
    
    // 更新投票记录
    await bpRecords.updateOne(
      { _id: new ObjectId(bp_id) },
      { $set: { current_votes: currentVotes, updated_at: new Date() } }
    );
    
    // 检查是否达到所需票数
    if (maxVotes < requiredVotes) {
      return res.json({
        code: 0,
        message: `已投票 ${map}，当前进度：${maxVotes}/${requiredVotes}`,
        data: {
          votes: currentVotes,
          vote_counts: voteCounts,
          required_votes: requiredVotes,
          waiting_for_votes: true
        }
      });
    }
    
    // 达到所需票数，执行BP
    const newHistory = [...bp.bp_history, {
      team: team,
      action: bp_action,
      map: selectedMap,
      votes: voteCounts,
      timestamp: new Date()
    }];
    
    const newAvailableMaps = bp.available_maps.filter(m => m !== selectedMap);
    const newStep = bp.current_step + 1;
    
    // 检查是否完成 BP
    let finalMap = null;
    let status = 'in_progress';
    
    // BP 流程：A Ban -> B Ban -> A Pick
    if (newStep >= 3 || newAvailableMaps.length === 1) {
      finalMap = bp_action === 'pick' ? selectedMap : newAvailableMaps[0];
      status = 'completed';
      
      // 创建比赛记录
      await matches.insertOne({
        room_id: bp.room_id,
        date: new Date(),
        map: finalMap,
        teamA: room.teamA,
        teamB: room.teamB,
        score_a: 0,
        score_b: 0,
        winner: null,
        mvp_id: null,
        status: 'playing',
        player_stats: [],
        created_at: new Date(),
        finished_at: null
      });
      
      // 更新房间状态
      await rooms.updateOne(
        { _id: new ObjectId(bp.room_id) },
        { $set: { status: 'playing', updated_at: new Date() } }
      );
    }
    
    // 更新 BP 记录
    await bpRecords.updateOne(
      { _id: new ObjectId(bp_id) },
      {
        $set: {
          bp_history: newHistory,
          available_maps: newAvailableMaps,
          current_step: newStep,
          current_votes: {},
          final_map: finalMap,
          status: status,
          updated_at: new Date()
        }
      }
    );
    
    res.json({
      code: 0,
      message: bp_action === 'ban' ? `${team} 队 Ban 掉 ${selectedMap}` : `${team} 队 Pick ${selectedMap}`,
      data: {
        available_maps: newAvailableMaps,
        final_map: finalMap,
        completed: status === 'completed',
        next_action: status === 'in_progress' ? getBPAction(newStep) : null,
        selected_map: selectedMap
      }
    });
  } catch (err) {
    console.error('BP投票失败:', err);
    res.json({
      code: 9999,
      message: 'BP投票失败：' + err.message,
      data: null
    });
  }
});

// 获取 BP 状态
router.get('/:bpId', async (req, res) => {
  try {
    const { bpId } = req.params;
    
    const bpRecords = getCollection('bp_records');
    const bp = await bpRecords.findOne({ _id: new ObjectId(bpId) });
    
    if (!bp) {
      return res.json({ code: 1003, message: 'BP 记录不存在', data: null });
    }
    
    res.json({
      code: 0,
      message: '获取成功',
      data: {
        ...bp,
        _id: bp._id.toString(),
        next_action: bp.status === 'in_progress' ? getBPAction(bp.current_step) : null,
        server_time: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('获取BP状态失败:', err);
    res.json({
      code: 9999,
      message: '获取失败：' + err.message,
      data: null
    });
  }
});

/**
 * 获取当前 BP 步骤应该的操作
 * BP 流程：A Ban -> B Ban -> A Pick
 */
function getBPAction(step) {
  const bpFlow = [
    { team: 'A', action: 'ban', desc: 'A队 Ban 地图' },
    { team: 'B', action: 'ban', desc: 'B队 Ban 地图' },
    { team: 'A', action: 'pick', desc: 'A队 Pick 地图' }
  ];
  
  return bpFlow[step] || null;
}

module.exports = router;

