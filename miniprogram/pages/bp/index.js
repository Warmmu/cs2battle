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
    teamBPlayers: []
  },

  async onBPMap(e) {
    const { map } = e.currentTarget.dataset
    const { bp_id, nextAction } = this.data

    if (!nextAction) {
      wx.showToast({
        title: 'BP 已完成',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: `${nextAction.action === 'ban' ? 'Ban' : 'Pick'} 中...` })

    try {
      const res = await wx.cloud.callFunction({
        name: 'bp',
        data: {
          action: 'doBP',
          bp_id: bp_id,
          team: nextAction.team,
          map: map,
          bp_action: nextAction.action
        }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        wx.showToast({
          title: res.result.message,
          icon: 'success'
        })

        if (res.result.data.completed) {
          // BP 完成，跳转到比赛页面
          setTimeout(() => {
            wx.redirectTo({
              url: `/pages/match/index?room_id=${this.data.room_id}`
            })
          }, 1500)
        } else {
          // 刷新 BP 状态
          this.getBPStatus()
        }
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
    const { bp_id } = this.data

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
        this.setData({
          bp: bp,
          availableMaps: bp.available_maps,
          bpHistory: bp.bp_history,
          nextAction: bp.next_action
        })
      }
    } catch (err) {
      console.error(err)
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
      console.error(err)
    }
  },

  async startBP() {
    const { room_id } = this.data

    wx.showLoading({ title: '开始 BP...' })

    try {
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
          nextAction: res.result.data.next_action
        })

        wx.showToast({
          title: 'BP 开始',
          icon: 'success'
        })
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
        title: 'BP 开始失败',
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

    this.getRoomInfo()
    this.startBP()
  }
})

