// 云函数：地图 Ban/Pick
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// CS2 官方地图池
const MAP_POOL = ['inferno', 'mirage', 'dust2', 'nuke', 'overpass', 'ancient', 'anubis']

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'startBP':
        return await startBP(event)
      case 'doBP':
        return await doBP(event)
      case 'getBPStatus':
        return await getBPStatus(event)
      default:
        return { code: 1001, message: '无效的操作', data: null }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 9999,
      message: 'BP操作失败：' + err.message,
      data: null
    }
  }
}

// 开始 BP
async function startBP(event) {
  const { room_id } = event
  
  const roomRes = await db.collection('rooms').doc(room_id).get()
  if (!roomRes.data) {
    return { code: 1003, message: '房间不存在', data: null }
  }
  
  const room = roomRes.data
  
  if (room.status !== 'matching') {
    return { code: 1005, message: '房间状态错误，需先完成匹配', data: null }
  }
  
  // 创建 BP 记录
  const result = await db.collection('bp_records').add({
    data: {
      room_id: room_id,
      maps: [...MAP_POOL],
      available_maps: [...MAP_POOL],
      bp_history: [],
      final_map: null,
      status: 'in_progress',
      current_step: 0,
      created_at: db.serverDate()
    }
  })
  
  // 更新房间状态
  await db.collection('rooms').doc(room_id).update({
    data: {
      status: 'bp',
      bp_id: result._id,
      updated_at: db.serverDate()
    }
  })
  
  return {
    code: 0,
    message: 'BP 开始',
    data: {
      bp_id: result._id,
      maps: MAP_POOL,
      next_action: getBPAction(0)
    }
  }
}

// 执行 BP 操作
async function doBP(event) {
  const { bp_id, team, map, bp_action } = event
  
  const bpRes = await db.collection('bp_records').doc(bp_id).get()
  if (!bpRes.data) {
    return { code: 1003, message: 'BP 记录不存在', data: null }
  }
  
  const bp = bpRes.data
  
  if (bp.status === 'completed') {
    return { code: 1005, message: 'BP 已完成', data: null }
  }
  
  // 验证地图是否可用
  if (!bp.available_maps.includes(map)) {
    return { code: 1001, message: '地图不可用', data: null }
  }
  
  // 验证操作是否正确
  const expectedAction = getBPAction(bp.current_step)
  if (expectedAction.team !== team || expectedAction.action !== bp_action) {
    return { 
      code: 1005, 
      message: `当前应该是 ${expectedAction.team} 队 ${expectedAction.action === 'ban' ? 'Ban' : 'Pick'}`,
      data: null 
    }
  }
  
  // 记录 BP 操作
  const newHistory = [...bp.bp_history, {
    team: team,
    action: bp_action,
    map: map,
    timestamp: new Date()
  }]
  
  // 从可用地图中移除
  const newAvailableMaps = bp.available_maps.filter(m => m !== map)
  const newStep = bp.current_step + 1
  
  // 检查是否完成 BP
  let finalMap = null
  let status = 'in_progress'
  
  // BP 流程：A Ban -> B Ban -> A Ban -> B Ban -> A Pick -> B Pick -> 剩余1张
  // 简化流程：A Ban -> B Ban -> A Pick (剩余地图作为比赛地图)
  if (newStep >= 3 || newAvailableMaps.length === 1) {
    finalMap = bp_action === 'pick' ? map : newAvailableMaps[0]
    status = 'completed'
    
    // 创建比赛记录
    const room = await db.collection('rooms').doc(bp.room_id).get()
    await db.collection('matches').add({
      data: {
        room_id: bp.room_id,
        date: db.serverDate(),
        map: finalMap,
        teamA: room.data.teamA,
        teamB: room.data.teamB,
        score_a: 0,
        score_b: 0,
        winner: null,
        mvp_id: null,
        status: 'playing',
        created_at: db.serverDate(),
        finished_at: null
      }
    })
    
    // 更新房间状态
    await db.collection('rooms').doc(bp.room_id).update({
      data: {
        status: 'playing',
        updated_at: db.serverDate()
      }
    })
  }
  
  // 更新 BP 记录
  await db.collection('bp_records').doc(bp_id).update({
    data: {
      bp_history: newHistory,
      available_maps: newAvailableMaps,
      current_step: newStep,
      final_map: finalMap,
      status: status,
      updated_at: db.serverDate()
    }
  })
  
  return {
    code: 0,
    message: bp_action === 'ban' ? `${team} 队 Ban 掉 ${map}` : `${team} 队 Pick ${map}`,
    data: {
      available_maps: newAvailableMaps,
      final_map: finalMap,
      completed: status === 'completed',
      next_action: status === 'in_progress' ? getBPAction(newStep) : null
    }
  }
}

// 获取 BP 状态
async function getBPStatus(event) {
  const { bp_id } = event
  
  const bpRes = await db.collection('bp_records').doc(bp_id).get()
  if (!bpRes.data) {
    return { code: 1003, message: 'BP 记录不存在', data: null }
  }
  
  const bp = bpRes.data
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      ...bp,
      next_action: bp.status === 'in_progress' ? getBPAction(bp.current_step) : null
    }
  }
}

/**
 * 获取当前 BP 步骤应该的操作
 * BP 流程：A Ban -> B Ban -> A Pick
 * @param {Number} step - 当前步骤
 * @returns {Object} 操作信息
 */
function getBPAction(step) {
  const bpFlow = [
    { team: 'A', action: 'ban', desc: 'A队 Ban 地图' },
    { team: 'B', action: 'ban', desc: 'B队 Ban 地图' },
    { team: 'A', action: 'pick', desc: 'A队 Pick 地图' }
  ]
  
  return bpFlow[step] || null
}

