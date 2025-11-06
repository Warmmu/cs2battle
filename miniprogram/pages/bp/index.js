// BP 地图页面
Page({
  data: {
    room_id: '',
    bp_id: '',
    bp: null,
    maps: [],
    availableMaps: [],
    bpHistory: [],
    nextAction: null,
    player_id: '',
    room: null,
    teamAPlayers: [],
    teamBPlayers: [],
    myTeam: '', // 当前玩家所在队伍
    canVote: false, // 当前玩家是否可以投票
    currentVotes: {}, // 当前投票情况
    voteProgress: '', // 投票进度
    polling: null, // 轮询定时器
    debugInfo: '', // 调试信息（显示在页面上）
    lastUpdateTime: '' // 最后更新时间
  },

  async onBPMap(e) {
    const { map } = e.currentTarget.dataset
    const { bp_id, nextAction, player_id, canVote } = this.data

    if (!nextAction) {
      wx.showToast({
        title: 'BP 已完成',
        icon: 'none'
      })
      return
    }

    if (!canVote) {
      wx.showToast({
        title: '当前不是您的队伍操作',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '投票中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'bp',
        data: {
          action: 'doBP',
          bp_id: bp_id,
          team: nextAction.team,
          map: map,
          bp_action: nextAction.action,
          player_id: player_id
        }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        const data = res.result.data
        
        wx.showToast({
          title: res.result.message,
          icon: 'success'
        })
        
        // 投票后等待500ms再刷新，确保数据库已更新
        setTimeout(() => {
          this.getBPStatus()
        }, 500)
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
        title: 'BP 操作失败',
        icon: 'none'
      })
    }
  },

  async getBPStatus() {
    const { bp_id, player_id, room, room_id } = this.data
    
    // 如果还没有bp_id，说明BP还未初始化，跳过本次轮询
    if (!bp_id) {
      this.setData({ 
        debugInfo: '等待BP初始化...',
        lastUpdateTime: new Date().toLocaleTimeString()
      })
      return
    }
    
    if (!room) {
      this.setData({ 
        debugInfo: '等待房间信息...',
        lastUpdateTime: new Date().toLocaleTimeString()
      })
      return
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'bp',
        data: {
          action: 'getBPStatus',
          bp_id: bp_id
        }
      })

      if (res.result.code === 0) {
        const bp = res.result.data
        
        // 检查BP是否已完成
        if (bp.status === 'completed') {
          this.stopPolling()
          wx.redirectTo({
            url: `/pages/match/index?room_id=${room_id}`
          })
          return
        }
        
        // 判断当前玩家所在队伍
        let myTeam = ''
        let canVote = false
        
        if (room.teamA.includes(player_id)) {
          myTeam = 'A'
        } else if (room.teamB.includes(player_id)) {
          myTeam = 'B'
        }
        
        // 判断是否轮到当前队伍
        if (bp.next_action && bp.next_action.team === myTeam) {
          canVote = true
        }
        
        // 计算投票进度
        let voteProgress = ''
        if (bp.current_votes && Object.keys(bp.current_votes).length > 0) {
          const voteCounts = {}
          Object.values(bp.current_votes).forEach(m => {
            voteCounts[m] = (voteCounts[m] || 0) + 1
          })
          const teamPlayers = myTeam === 'A' ? room.teamA : room.teamB
          const requiredVotes = Math.ceil(teamPlayers.length / 2)
          const maxVotes = Math.max(...Object.values(voteCounts))
          voteProgress = `${maxVotes}/${requiredVotes}`
        }
        
        // 生成调试信息，包含更多细节
        const debugInfo = `Step: ${bp.current_step} | 轮询正常 | ${bp.next_action ? bp.next_action.team + '队' + (bp.next_action.action === 'ban' ? 'Ban' : 'Pick') : '完成'} | 可选:${bp.available_maps.length}`
        
        // 强制更新所有数据，确保同步
        this.setData({
          bp: bp,
          availableMaps: bp.available_maps || [],
          bpHistory: bp.bp_history || [],
          nextAction: bp.next_action,
          myTeam: myTeam,
          canVote: canVote,
          currentVotes: bp.current_votes || {},
          voteProgress: voteProgress,
          debugInfo: debugInfo,
          lastUpdateTime: new Date().toLocaleTimeString(),
          maps: bp.maps || [] // 也更新地图列表
        })
      } else {
        this.setData({ 
          debugInfo: '获取失败: ' + res.result.message,
          lastUpdateTime: new Date().toLocaleTimeString()
        })
      }
    } catch (err) {
      this.setData({ 
        debugInfo: '出错: ' + (err.errMsg || '未知错误'),
        lastUpdateTime: new Date().toLocaleTimeString()
      })
      // 不要停止轮询，继续尝试
    }
  },

  async getRoomInfo() {
    const { room_id } = this.data

    try {
      const res = await wx.cloud.callFunction({
        name: 'room',
        data: {
          action: 'getRoomStatus',
          room_id: room_id
        }
      })

      if (res.result.code === 0) {
        const room = res.result.data
        
        // 预处理队伍数据，方便 WXML 直接使用
        const teamAPlayers = room.teamA.map(playerId => {
          const player = room.players.find(p => p.player_id === playerId)
          return {
            player_id: playerId,
            nickname: player ? player.nickname : '未知玩家',
            elo: player ? player.elo : 0
          }
        })
        
        const teamBPlayers = room.teamB.map(playerId => {
          const player = room.players.find(p => p.player_id === playerId)
          return {
            player_id: playerId,
            nickname: player ? player.nickname : '未知玩家',
            elo: player ? player.elo : 0
          }
        })
        
        this.setData({
          room: room,
          teamAPlayers: teamAPlayers,
          teamBPlayers: teamBPlayers
        })
      }
    } catch (err) {
      this.setData({ 
        debugInfo: '房间信息加载失败',
        lastUpdateTime: new Date().toLocaleTimeString()
      })
    }
  },

  startPolling() {
    this.stopPolling()
    
    // 立即获取一次状态
    this.getBPStatus()
    
    // 每1.5秒刷新一次BP状态（加快轮询）
    const polling = setInterval(() => {
      this.getBPStatus()
    }, 1500)
    
    this.setData({ 
      polling,
      debugInfo: '轮询已启动',
      lastUpdateTime: new Date().toLocaleTimeString()
    })
  },

  stopPolling() {
    if (this.data.polling) {
      clearInterval(this.data.polling)
      this.setData({ polling: null })
    }
  },

  async initBP() {
    const { room_id } = this.data

    wx.showLoading({ title: '加载 BP...' })

    try {
      // 先检查房间是否已有BP记录
      const roomRes = await wx.cloud.callFunction({
        name: 'room',
        data: {
          action: 'getRoomStatus',
          room_id: room_id
        }
      })

      if (roomRes.result.code === 0 && roomRes.result.data.bp_id) {
        // 已经有BP记录，直接加载
        const bp_id = roomRes.result.data.bp_id
        
        this.setData({ 
          bp_id,
          debugInfo: 'BP已存在，加载中...',
          lastUpdateTime: new Date().toLocaleTimeString()
        }, () => {
          // bp_id设置完成后再获取BP状态
          this.getBPStatus()
        })
        
        wx.hideLoading()
      } else {
        // 没有BP记录，创建新的
        const res = await wx.cloud.callFunction({
          name: 'bp',
          data: {
            action: 'startBP',
            room_id: room_id
          }
        })

        wx.hideLoading()

        if (res.result.code === 0) {
          this.setData({
            bp_id: res.result.data.bp_id,
            maps: res.result.data.maps,
            availableMaps: res.result.data.maps,
            nextAction: res.result.data.next_action,
            debugInfo: 'BP创建成功',
            lastUpdateTime: new Date().toLocaleTimeString()
          })

          wx.showToast({
            title: 'BP 开始',
            icon: 'success'
          })
        } else {
          this.setData({ 
            debugInfo: 'BP创建失败: ' + res.result.message,
            lastUpdateTime: new Date().toLocaleTimeString()
          })
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          })
        }
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ 
        debugInfo: 'BP加载出错',
        lastUpdateTime: new Date().toLocaleTimeString()
      })
      wx.showToast({
        title: 'BP 加载失败',
        icon: 'none'
      })
    }
  },

  async onLoad(options) {
    const { room_id } = options
    const player_id = wx.getStorageSync('player_id')

    if (!room_id || !player_id) {
      wx.navigateBack()
      return
    }

    this.setData({
      room_id,
      player_id,
      debugInfo: '页面加载中...',
      lastUpdateTime: new Date().toLocaleTimeString()
    })

    // 先加载房间信息
    await this.getRoomInfo()
    
    // 然后初始化BP
    await this.initBP()
    
    // 最后启动轮询（确保bp_id和room都已加载）
    this.startPolling()
  },

  onUnload() {
    this.stopPolling()
  }
})

