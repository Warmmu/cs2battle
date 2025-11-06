// 大厅页面
Page({
  data: {
    player_id: '',
    nickname: '',
    room: null,
    room_id: '',
    polling: null,
    currentPlayerReady: false
  },

  async onJoinRoom() {
    const { player_id } = this.data

    wx.showLoading({ title: '加入房间中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'room',
        data: {
          action: 'join',
          player_id: player_id
        }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        this.setData({
          room: res.result.data,
          room_id: res.result.data._id
        })

        // 开始轮询房间状态
        this.startPolling()

        wx.showToast({
          title: '加入成功',
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
        title: '加入失败',
        icon: 'none'
      })
    }
  },

  async onReady() {
    const { player_id, room_id, room } = this.data
    
    if (!room) {
      console.log('❌ 房间不存在')
      return
    }

    const currentPlayer = room.players.find(p => p.player_id === player_id)
    const newReadyState = !currentPlayer.ready
    
    console.log('🎮 点击准备按钮', {
      player_id,
      room_id,
      newReadyState,
      currentPlayers: room.players.length
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'room',
        data: {
          action: 'ready',
          player_id: player_id,
          room_id: room_id,
          ready: newReadyState
        }
      })
      
      console.log('📡 云函数返回结果:', res.result)

      if (res.result.code === 0) {
        // 刷新房间状态
        this.getRoomStatus()

        wx.showToast({
          title: newReadyState ? '已准备' : '取消准备',
          icon: 'success'
        })
        
        console.log('✅ 准备状态更新成功', res.result.data)
      } else {
        console.error('❌ 准备失败:', res.result.message)
      }
    } catch (err) {
      console.error('❌ 调用云函数出错:', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  async onStartMatch() {
    const { room_id } = this.data

    wx.showLoading({ title: '匹配中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'match',
        data: {
          room_id: room_id
        }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        wx.showToast({
          title: '匹配成功',
          icon: 'success'
        })

        // 跳转到 BP 页面
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/bp/index?room_id=${room_id}`
          })
        }, 1500)
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
        title: '匹配失败',
        icon: 'none'
      })
    }
  },

  async onLeaveRoom() {
    const { player_id, room_id } = this.data

    try {
      await wx.cloud.callFunction({
        name: 'room',
        data: {
          action: 'leave',
          player_id: player_id,
          room_id: room_id
        }
      })

      this.setData({
        room: null,
        room_id: ''
      })

      this.stopPolling()

      wx.showToast({
        title: '已离开房间',
        icon: 'success'
      })
    } catch (err) {
      console.error(err)
    }
  },

  async getRoomStatus() {
    const { room_id, player_id } = this.data
    if (!room_id) return

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
        
        // 查找当前玩家的准备状态
        const currentPlayer = room.players.find(p => p.player_id === player_id)
        const currentPlayerReady = currentPlayer ? currentPlayer.ready : false
        
        console.log('🔄 房间状态更新:', {
          status: room.status,
          players: room.players.length,
          allReady: room.players.every(p => p.ready),
          currentPlayerReady
        })
        
        this.setData({
          room: room,
          currentPlayerReady: currentPlayerReady
        })

        // 如果所有人准备好了，自动开始匹配
        if (room.status === 'ready') {
          console.log('✨ 所有人准备完毕，开始匹配！')
          this.onStartMatch()
        }
      }
    } catch (err) {
      console.error('❌ 获取房间状态失败:', err)
    }
  },

  startPolling() {
    this.stopPolling()
    const polling = setInterval(() => {
      this.getRoomStatus()
    }, 2000) // 每2秒刷新一次

    this.setData({ polling })
  },

  stopPolling() {
    if (this.data.polling) {
      clearInterval(this.data.polling)
      this.setData({ polling: null })
    }
  },

  onViewHistory() {
    wx.navigateTo({
      url: '/pages/history/index'
    })
  },

  onViewRanking() {
    wx.navigateTo({
      url: '/pages/ranking/index'
    })
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('player_id')
          wx.removeStorageSync('nickname')
          
          // 如果在房间中，先离开房间
          if (this.data.room_id) {
            this.onLeaveRoom()
          }
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          // 跳转到登录页
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/index'
            })
          }, 1500)
        }
      }
    })
  },

  onLoad() {
    const player_id = wx.getStorageSync('player_id')
    const nickname = wx.getStorageSync('nickname')

    if (!player_id) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }

    this.setData({
      player_id,
      nickname
    })
  },

  onUnload() {
    this.stopPolling()
  }
})

