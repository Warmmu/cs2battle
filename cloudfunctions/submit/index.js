// 云函数：提交比赛结果与计算 ELO
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { match_id, score_a, score_b, player_stats } = event
  
  try {
    // 获取比赛信息
    const matchRes = await db.collection('matches').doc(match_id).get()
    if (!matchRes.data) {
      return { code: 1003, message: '比赛不存在', data: null }
    }
    
    const match = matchRes.data
    
    if (match.status === 'finished') {
      return { code: 1005, message: '比赛已结束', data: null }
    }
    
    // 确定获胜方
    let winner = 'draw'
    if (score_a > score_b) {
      winner = 'A'
    } else if (score_b > score_a) {
      winner = 'B'
    }
    
    // 获取所有玩家信息
    const playerIds = [...match.teamA, ...match.teamB]
    const playersRes = await db.collection('players').where({
      _id: _.in(playerIds)
    }).get()
    
    const playersMap = {}
    playersRes.data.forEach(p => {
      playersMap[p._id] = p
    })
    
    // 计算平均 ELO（防止除以0）
    const teamA_elo = match.teamA.length > 0 
      ? match.teamA.reduce((sum, pid) => sum + (playersMap[pid]?.elo || 1000), 0) / match.teamA.length
      : 1000
    const teamB_elo = match.teamB.length > 0 
      ? match.teamB.reduce((sum, pid) => sum + (playersMap[pid]?.elo || 1000), 0) / match.teamB.length
      : 1000
    
    // 计算 ELO 变化
    const eloChanges = []
    
    for (const stat of player_stats) {
      const player = playersMap[stat.player_id]
      if (!player) continue
      
      const isTeamA = match.teamA.includes(stat.player_id)
      const team = isTeamA ? 'A' : 'B'
      const won = (team === 'A' && winner === 'A') || (team === 'B' && winner === 'B')
      const draw = winner === 'draw'
      
      // 计算 ELO 变化
      const elo_change = calculateEloChange(
        player.elo,
        isTeamA ? teamB_elo : teamA_elo,
        won ? 1 : (draw ? 0.5 : 0),
        stat.kills,
        stat.deaths
      )
      
      const new_elo = player.elo + elo_change
      
      // 计算 KD 比率（防止非法值）
      let kd_ratio = 0
      if (stat.deaths > 0) {
        kd_ratio = parseFloat((stat.kills / stat.deaths).toFixed(2))
      } else if (stat.kills > 0) {
        kd_ratio = stat.kills
      }
      
      const rating = calculateRating(stat.kills, stat.deaths, stat.assists || 0)
      
      // 确保所有值都是合法的
      const finalElo = isFinite(new_elo) ? Math.round(new_elo) : player.elo
      const finalChange = isFinite(elo_change) ? Math.round(elo_change) : 0
      
      // 保存玩家统计
      await db.collection('player_stats').add({
        data: {
          match_id: match_id,
          player_id: stat.player_id,
          team: team,
          kills: parseInt(stat.kills) || 0,
          deaths: parseInt(stat.deaths) || 0,
          assists: parseInt(stat.assists) || 0,
          kd_ratio: isFinite(kd_ratio) ? kd_ratio : 0,
          rating: isFinite(rating) ? rating : 0,
          elo_before: player.elo || 1000,
          elo_after: finalElo,
          elo_change: finalChange,
          created_at: db.serverDate()
        }
      })
      
      // 更新玩家 ELO 和统计
      await db.collection('players').doc(stat.player_id).update({
        data: {
          elo: finalElo,
          total_matches: _.inc(1),
          wins: won ? _.inc(1) : _.inc(0),
          losses: (!won && !draw) ? _.inc(1) : _.inc(0),
          total_kills: _.inc(parseInt(stat.kills) || 0),
          total_deaths: _.inc(parseInt(stat.deaths) || 0),
          updated_at: db.serverDate()
        }
      })
      
      // 保存 ELO 历史
      await db.collection('elo_history').add({
        data: {
          player_id: stat.player_id,
          match_id: match_id,
          elo_before: player.elo || 1000,
          elo_after: finalElo,
          elo_change: finalChange,
          reason: won ? 'win' : (draw ? 'draw' : 'loss'),
          created_at: db.serverDate()
        }
      })
      
      eloChanges.push({
        player_id: stat.player_id,
        nickname: player.nickname,
        elo_change: finalChange,
        new_elo: finalElo
      })
    }
    
    // 找出 MVP（最高评分）
    let mvp = player_stats[0]
    for (const stat of player_stats) {
      const mvpRating = calculateRating(mvp.kills, mvp.deaths, mvp.assists || 0)
      const currentRating = calculateRating(stat.kills, stat.deaths, stat.assists || 0)
      if (currentRating > mvpRating) {
        mvp = stat
      }
    }
    
    // 更新比赛状态
    await db.collection('matches').doc(match_id).update({
      data: {
        score_a: score_a,
        score_b: score_b,
        winner: winner,
        mvp_id: mvp.player_id,
        status: 'finished',
        finished_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '比赛结果提交成功',
      data: {
        match_id: match_id,
        winner: winner,
        mvp_id: mvp.player_id,
        elo_changes: eloChanges
      }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 9999,
      message: '提交失败：' + err.message,
      data: null
    }
  }
}

/**
 * 计算 ELO 变化
 * @param {Number} playerElo - 玩家当前 ELO
 * @param {Number} opponentElo - 对手平均 ELO
 * @param {Number} score - 实际得分 (1=胜, 0.5=平, 0=负)
 * @param {Number} kills - 击杀数
 * @param {Number} deaths - 死亡数
 * @returns {Number} ELO 变化值
 */
function calculateEloChange(playerElo, opponentElo, score, kills, deaths) {
  // K 因子（根据 ELO 动态调整）
  let K = 32
  if (playerElo < 1200) {
    K = 40 // 新手变化更快
  } else if (playerElo > 1800) {
    K = 24 // 高手变化较慢
  }
  
  // 期望胜率
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  
  // 基础 ELO 变化
  let eloChange = K * (score - expectedScore)
  
  // KD 修正（表现优异可以获得额外加成）
  const kd = deaths > 0 ? kills / deaths : kills
  if (kd > 1.5) {
    eloChange *= 1.2 // 表现优秀，额外 20% 加成
  } else if (kd < 0.8) {
    eloChange *= 0.8 // 表现不佳，减少 20%
  }
  
  return Math.round(eloChange)
}

/**
 * 计算玩家评分
 * @param {Number} kills - 击杀
 * @param {Number} deaths - 死亡
 * @param {Number} assists - 助攻
 * @returns {Number} 评分
 */
function calculateRating(kills, deaths, assists) {
  // 简化的 Rating 计算公式
  const kd = deaths > 0 ? kills / deaths : kills
  const rating = (kills * 1.0 + assists * 0.3) / (deaths > 0 ? deaths : 1)
  return parseFloat(rating.toFixed(2))
}

