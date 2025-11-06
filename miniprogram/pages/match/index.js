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
    teamBPlayers: []
  },

  onScoreAChange(e) {
    this.setData({
      scoreA: parseInt(e.detail.value) || 0
    })
  },

  onScoreBChange(e) {
    this.setData({
      scoreB: parseInt(e.detail.value) || 0
    })
  },

  onStatInput(e) {
    const { playerId, type } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    
    const { playerStats } = this.data
    const index = playerStats.findIndex(p => p.player_id === playerId)
    
    if (index !== -1) {
      playerStats[index][type] = value
      this.setData({ playerStats })
    }
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
      
      // 预处理队伍玩家信息，方便 WXML 使用
      const teamAPlayers = match.teamA.map(playerId => {
        const player = room.players.find(p => p.player_id === playerId)
        return {
          player_id: playerId,
          nickname: player ? player.nickname : '未知玩家'
        }
      })
      
      const teamBPlayers = match.teamB.map(playerId => {
        const player = room.players.find(p => p.player_id === playerId)
        return {
          player_id: playerId,
          nickname: player ? player.nickname : '未知玩家'
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
  }
})

