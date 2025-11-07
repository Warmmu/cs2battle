// 比赛页面（录入结果）
Page({
  data: {
    room_id: '',
    match_id: '',
    match: null,
    room: null,
    player_id: '',
    scoreA: 0,
    scoreB: 0,
    playerStats: [],
    teamAPlayers: [],
    teamBPlayers: [],
    polling: null, // 轮询定时器
    lastUpdateTime: '', // 最后更新时间
    hasSubmitted: false // 是否已提交
  },

  onScoreAChange(e) {
    const scoreA = parseInt(e.detail.value) || 0
    this.setData({ scoreA })
    this.saveMatchData()
  },

  onScoreBChange(e) {
    const scoreB = parseInt(e.detail.value) || 0
    this.setData({ scoreB })
    this.saveMatchData()
  },

  onStatInput(e) {
    const { playerId, type } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    
    const { playerStats, teamAPlayers, teamBPlayers } = this.data
    const statIndex = playerStats.findIndex(p => p.player_id === playerId)
    
    if (statIndex !== -1) {
      playerStats[statIndex][type] = value
      
      // 同时更新teamAPlayers或teamBPlayers中的对应数据
      const teamAIndex = teamAPlayers.findIndex(p => p.player_id === playerId)
      if (teamAIndex !== -1) {
        teamAPlayers[teamAIndex][type] = value
      }
      
      const teamBIndex = teamBPlayers.findIndex(p => p.player_id === playerId)
      if (teamBIndex !== -1) {
        teamBPlayers[teamBIndex][type] = value
      }
      
      this.setData({ 
        playerStats,
        teamAPlayers,
        teamBPlayers
      })
      this.saveMatchData()
    }
  },

  // 实时保存数据（防抖）
  saveMatchData() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    
    this.saveTimer = setTimeout(async () => {
      const { match_id, scoreA, scoreB, playerStats } = this.data
      
      try {
        await wx.cloud.callFunction({
          name: 'submit',
          data: {
            action: 'updateData',
            match_id: match_id,
            score_a: scoreA,
            score_b: scoreB,
            player_stats: playerStats
          }
        })
      } catch (err) {
        console.error('保存数据失败:', err)
      }
    }, 1000) // 1秒后保存
  },

  async onSubmit() {
    const { match_id, scoreA, scoreB, playerStats } = this.data

    // 验证数据
    if (scoreA === 0 && scoreB === 0) {
      wx.showToast({
        title: '请输入比分',
        icon: 'none'
      })
      return
    }

    // 检查是否所有玩家数据都已填写
    const incomplete = playerStats.some(p => !p.kills && !p.deaths)
    if (incomplete) {
      wx.showToast({
        title: '请填写所有玩家数据',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '提交中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'submit',
        data: {
          match_id: match_id,
          score_a: scoreA,
          score_b: scoreB,
          player_stats: playerStats
        }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        })

        // 显示 ELO 变化
        this.showEloChanges(res.result.data.elo_changes)

        // 跳转回大厅
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/lobby/index'
          })
        }, 3000)
      } else {
        wx.showToast({
          title: res.result.message,
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      console.error(err)
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  },

  showEloChanges(changes) {
    const messages = changes.map(c => 
      `${c.nickname}: ${c.elo_change > 0 ? '+' : ''}${c.elo_change} (${c.new_elo})`
    ).join('\n')

    wx.showModal({
      title: 'ELO 变化',
      content: messages,
      showCancel: false
    })
  },

  async getMatchInfo() {
    const { room_id } = this.data

    try {
      // 获取房间信息
      const roomRes = await wx.cloud.callFunction({
        name: 'room',
        data: {
          action: 'getRoomStatus',
          room_id: room_id
        }
      })

      if (roomRes.result.code !== 0) {
        wx.showToast({
          title: '获取房间信息失败',
          icon: 'none'
        })
        return
      }

      const room = roomRes.result.data

      // 获取比赛信息
      const db = wx.cloud.database()
      const matchRes = await db.collection('matches')
        .where({ room_id: room_id, status: 'playing' })
        .orderBy('created_at', 'desc')
        .limit(1)
        .get()

      if (matchRes.data.length === 0) {
        wx.showToast({
          title: '比赛不存在',
          icon: 'none'
        })
        return
      }

      const match = matchRes.data[0]

      // 初始化玩家统计数据
      const playerStats = [...match.teamA, ...match.teamB].map(playerId => ({
        player_id: playerId,
        kills: 0,
        deaths: 0,
        assists: 0
      }))
      
      // 预处理队伍玩家信息，包含KDA数据，方便 WXML 使用
      const teamAPlayers = match.teamA.map(playerId => {
        const player = room.players.find(p => p.player_id === playerId)
        const stats = playerStats.find(s => s.player_id === playerId) || {}
        return {
          player_id: playerId,
          nickname: player ? player.nickname : '未知玩家',
          kills: stats.kills || 0,
          deaths: stats.deaths || 0,
          assists: stats.assists || 0
        }
      })
      
      const teamBPlayers = match.teamB.map(playerId => {
        const player = room.players.find(p => p.player_id === playerId)
        const stats = playerStats.find(s => s.player_id === playerId) || {}
        return {
          player_id: playerId,
          nickname: player ? player.nickname : '未知玩家',
          kills: stats.kills || 0,
          deaths: stats.deaths || 0,
          assists: stats.assists || 0
        }
      })

      this.setData({
        room,
        match,
        match_id: match._id,
        playerStats,
        teamAPlayers,
        teamBPlayers
      })
    } catch (err) {
      console.error(err)
      wx.showToast({
        title: '获取比赛信息失败',
        icon: 'none'
      })
    }
  },

  async getMatchStatus() {
    const { match_id, playerStats, teamAPlayers, teamBPlayers } = this.data
    if (!match_id) return

    try {
      const db = wx.cloud.database()
      const matchRes = await db.collection('matches').doc(match_id).get()
      
      if (matchRes.data) {
        const match = matchRes.data
        
        // 如果比赛已完成，停止轮询并跳转
        if (match.status === 'finished') {
          this.stopPolling()
          wx.showToast({
            title: '比赛已提交',
            icon: 'success'
          })
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/lobby/index'
            })
          }, 1500)
          return
        }
        
        const updateData = {
          lastUpdateTime: new Date().toLocaleTimeString()
        }
        
        // 同步比分
        if (match.score_a !== undefined) {
          updateData.scoreA = match.score_a || 0
        }
        if (match.score_b !== undefined) {
          updateData.scoreB = match.score_b || 0
        }
        
        // 同步玩家数据
        if (match.player_stats && match.player_stats.length > 0) {
          // 更新playerStats
          const syncedStats = playerStats.map(localStat => {
            const remoteStat = match.player_stats.find(p => p.player_id === localStat.player_id)
            if (remoteStat) {
              return {
                ...localStat,
                kills: remoteStat.kills || 0,
                deaths: remoteStat.deaths || 0,
                assists: remoteStat.assists || 0
              }
            }
            return localStat
          })
          updateData.playerStats = syncedStats
          
          // 同时更新teamAPlayers
          updateData.teamAPlayers = teamAPlayers.map(player => {
            const stats = match.player_stats.find(s => s.player_id === player.player_id)
            if (stats) {
              return {
                ...player,
                kills: stats.kills || 0,
                deaths: stats.deaths || 0,
                assists: stats.assists || 0
              }
            }
            return player
          })
          
          // 同时更新teamBPlayers
          updateData.teamBPlayers = teamBPlayers.map(player => {
            const stats = match.player_stats.find(s => s.player_id === player.player_id)
            if (stats) {
              return {
                ...player,
                kills: stats.kills || 0,
                deaths: stats.deaths || 0,
                assists: stats.assists || 0
              }
            }
            return player
          })
        }
        
        this.setData(updateData)
      }
    } catch (err) {
      console.error('获取比赛状态失败:', err)
    }
  },

  startPolling() {
    this.stopPolling()
    
    // 立即获取一次状态
    this.getMatchStatus()
    
    // 每2秒刷新一次
    const polling = setInterval(() => {
      this.getMatchStatus()
    }, 2000)
    
    this.setData({ polling })
  },

  stopPolling() {
    if (this.data.polling) {
      clearInterval(this.data.polling)
      this.setData({ polling: null })
    }
  },

  onLoad(options) {
    const { room_id } = options
    const player_id = wx.getStorageSync('player_id')

    if (!room_id || !player_id) {
      wx.navigateBack()
      return
    }

    this.setData({
      room_id,
      player_id
    })

    this.getMatchInfo()
    
    // 启动轮询，实时同步数据
    setTimeout(() => {
      this.startPolling()
    }, 1000)
  },

  onUnload() {
    this.stopPolling()
  }
})

