// 云函数：历史记录与排行榜
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'getPlayerHistory':
        return await getPlayerHistory(event)
      case 'getMatchDetail':
        return await getMatchDetail(event)
      case 'getRanking':
        return await getRanking(event)
      case 'getPlayerInfo':
        return await getPlayerInfo(event)
      default:
        return { code: 1001, message: '无效的操作', data: null }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 9999,
      message: '操作失败：' + err.message,
      data: null
    }
  }
}

// 获取玩家历史记录
async function getPlayerHistory(event) {
  const { player_id, page = 1, limit = 10 } = event
  
  // 获取玩家参与的所有比赛
  const matchesRes = await db.collection('matches')
    .where(_.or([
      { teamA: player_id },
      { teamB: player_id }
    ]))
    .orderBy('created_at', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get()
  
  const matches = []
  
  for (const match of matchesRes.data) {
    // 获取该玩家在这场比赛的数据
    const statsRes = await db.collection('player_stats')
      .where({
        match_id: match._id,
        player_id: player_id
      })
      .get()
    
    const stat = statsRes.data[0] || {}
    
    matches.push({
      match_id: match._id,
      date: match.date,
      map: match.map,
      score: `${match.score_a}-${match.score_b}`,
      winner: match.winner,
      my_team: match.teamA.includes(player_id) ? 'A' : 'B',
      won: (match.teamA.includes(player_id) && match.winner === 'A') || 
           (match.teamB.includes(player_id) && match.winner === 'B'),
      kills: stat.kills || 0,
      deaths: stat.deaths || 0,
      kd_ratio: stat.kd_ratio || 0,
      elo_change: stat.elo_change || 0,
      mvp: match.mvp_id === player_id
    })
  }
  
  // 获取总记录数
  const countRes = await db.collection('matches')
    .where(_.or([
      { teamA: player_id },
      { teamB: player_id }
    ]))
    .count()
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      matches: matches,
      total: countRes.total,
      page: page,
      limit: limit
    }
  }
}

// 获取比赛详情
async function getMatchDetail(event) {
  const { match_id } = event
  
  const matchRes = await db.collection('matches').doc(match_id).get()
  if (!matchRes.data) {
    return { code: 1003, message: '比赛不存在', data: null }
  }
  
  const match = matchRes.data
  
  // 获取所有玩家统计
  const statsRes = await db.collection('player_stats')
    .where({ match_id: match_id })
    .get()
  
  // 获取玩家信息
  const playerIds = [...match.teamA, ...match.teamB]
  const playersRes = await db.collection('players')
    .where({ _id: _.in(playerIds) })
    .get()
  
  const playersMap = {}
  playersRes.data.forEach(p => {
    playersMap[p._id] = p
  })
  
  // 组织数据
  const teamA_stats = []
  const teamB_stats = []
  
  for (const stat of statsRes.data) {
    const player = playersMap[stat.player_id]
    const statData = {
      ...stat,
      nickname: player.nickname,
      avatar: player.avatar
    }
    
    if (stat.team === 'A') {
      teamA_stats.push(statData)
    } else {
      teamB_stats.push(statData)
    }
  }
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      match: match,
      teamA_stats: teamA_stats,
      teamB_stats: teamB_stats
    }
  }
}

// 获取排行榜
async function getRanking(event) {
  const { limit = 50 } = event
  
  const playersRes = await db.collection('players')
    .orderBy('elo', 'desc')
    .limit(limit)
    .get()
  
  const ranking = playersRes.data.map((player, index) => ({
    rank: index + 1,
    player_id: player._id,
    nickname: player.nickname,
    avatar: player.avatar,
    elo: player.elo,
    total_matches: player.total_matches,
    wins: player.wins,
    losses: player.losses,
    win_rate: player.total_matches > 0 ? 
      ((player.wins / player.total_matches) * 100).toFixed(1) : '0.0',
    kd_ratio: player.total_deaths > 0 ? 
      (player.total_kills / player.total_deaths).toFixed(2) : player.total_kills
  }))
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      ranking: ranking
    }
  }
}

// 获取玩家信息
async function getPlayerInfo(event) {
  const { player_id } = event
  
  const playerRes = await db.collection('players').doc(player_id).get()
  if (!playerRes.data) {
    return { code: 1002, message: '玩家不存在', data: null }
  }
  
  const player = playerRes.data
  
  // 获取最近的 ELO 历史
  const eloHistoryRes = await db.collection('elo_history')
    .where({ player_id: player_id })
    .orderBy('created_at', 'desc')
    .limit(20)
    .get()
  
  // 计算胜率
  const winRate = player.total_matches > 0 ? 
    ((player.wins / player.total_matches) * 100).toFixed(1) : '0.0'
  
  // 计算 KD
  const kdRatio = player.total_deaths > 0 ? 
    (player.total_kills / player.total_deaths).toFixed(2) : player.total_kills
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      player: {
        ...player,
        win_rate: winRate,
        kd_ratio: kdRatio
      },
      elo_history: eloHistoryRes.data
    }
  }
}

