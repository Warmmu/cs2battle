// 注册页面
Page({
  data: {
    nickname: '',
    steam_id: ''
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  onSteamIdInput(e) {
    this.setData({
      steam_id: e.detail.value
    })
  },

  async onRegister() {
    const { nickname, steam_id } = this.data

    if (!nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '注册中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'register',
        data: {
          nickname: nickname.trim(),
          steam_id: steam_id.trim() || null
        }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        // 保存玩家 ID 到本地
        wx.setStorageSync('player_id', res.result.data.player_id)
        wx.setStorageSync('nickname', res.result.data.nickname)

        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })

        // 跳转到大厅
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/lobby/index'
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
        title: '注册失败',
        icon: 'none'
      })
    }
  },

  onGoLogin() {
    wx.redirectTo({
      url: '/pages/login/index'
    })
  },

  onLoad() {
    // 检查是否已注册
    const player_id = wx.getStorageSync('player_id')
    if (player_id) {
      wx.redirectTo({
        url: '/pages/lobby/index'
      })
    }
  }
})

