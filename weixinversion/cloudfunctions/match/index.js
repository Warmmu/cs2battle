// 云函数：匹配分队（ELO 平衡算法）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { room_id } = event
  
  try {
    const roomRes = await db.collection('rooms').doc(room_id).get()
    if (!roomRes.data) {
      return { code: 1003, message: '房间不存在', data: null }
    }
    
    const room = roomRes.data
    
    if (room.status !== 'ready') {
      return { code: 1005, message: '房间状态错误，所有玩家需准备', data: null }
    }
    
    if (room.players.length < 2) {
      return { code: 1001, message: '玩家数量不足，至少需要2人', data: null }
    }
    
    // 使用 ELO 平衡算法分队
    const teams = balanceTeams(room.players)
    
    // 更新房间信息
    await db.collection('rooms').doc(room_id).update({
      data: {
        teamA: teams.teamA.map(p => p.player_id),
        teamB: teams.teamB.map(p => p.player_id),
        elo_diff: teams.elo_diff,
        status: 'matching',
        updated_at: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '匹配成功',
      data: {
        teamA: teams.teamA,
        teamB: teams.teamB,
        elo_diff: teams.elo_diff,
        teamA_avg_elo: teams.teamA_avg,
        teamB_avg_elo: teams.teamB_avg
      }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 9999,
      message: '匹配失败：' + err.message,
      data: null
    }
  }
}

/**
 * ELO 平衡算法 - 使用暴力枚举找到最平衡的分队方案
 * @param {Array} players - 玩家列表
 * @returns {Object} 分队结果
 */
function balanceTeams(players) {
  const n = players.length
  const halfSize = Math.floor(n / 2)
  
  let bestDiff = Infinity
  let bestTeamA = []
  let bestTeamB = []
  
  // 生成所有可能的组合
  const combinations = getCombinations(players, halfSize)
  
  for (const teamA of combinations) {
    const teamB = players.filter(p => !teamA.includes(p))
    
    // 防止空队伍
    if (teamA.length === 0 || teamB.length === 0) continue
    
    const eloA = teamA.reduce((sum, p) => sum + p.elo, 0) / teamA.length
    const eloB = teamB.reduce((sum, p) => sum + p.elo, 0) / teamB.length
    const diff = Math.abs(eloA - eloB)
    
    if (diff < bestDiff) {
      bestDiff = diff
      bestTeamA = teamA
      bestTeamB = teamB
    }
  }
  
  const teamA_avg = bestTeamA.length > 0 ? 
    bestTeamA.reduce((sum, p) => sum + p.elo, 0) / bestTeamA.length : 0
  const teamB_avg = bestTeamB.length > 0 ? 
    bestTeamB.reduce((sum, p) => sum + p.elo, 0) / bestTeamB.length : 0
  
  return {
    teamA: bestTeamA,
    teamB: bestTeamB,
    elo_diff: Math.round(bestDiff),
    teamA_avg: Math.round(teamA_avg),
    teamB_avg: Math.round(teamB_avg)
  }
}

/**
 * 获取所有组合
 * @param {Array} arr - 数组
 * @param {Number} size - 组合大小
 * @returns {Array} 所有组合
 */
function getCombinations(arr, size) {
  const result = []
  
  function combine(start, combo) {
    if (combo.length === size) {
      result.push([...combo])
      return
    }
    
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i])
      combine(i + 1, combo)
      combo.pop()
    }
  }
  
  combine(0, [])
  return result
}

