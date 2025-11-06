// 登录页面
Page({
  data: {
    nickname: ''
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  async onLogin() {
    const { nickname } = this.data

    if (!nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '登录中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          nickname: nickname.trim()
        }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        // 保存玩家信息到本地
        wx.setStorageSync('player_id', res.result.data.player_id)
        wx.setStorageSync('nickname', res.result.data.nickname)

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 跳转到大厅
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/lobby/index'
          })
        }, 1500)
      } else {
        wx.showModal({
          title: '提示',
          content: res.result.message,
          showCancel: true,
          cancelText: '重试',
          confirmText: '去注册',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 跳转到注册页面
              wx.redirectTo({
                url: '/pages/register/index'
              })
            }
          }
        })
      }
    } catch (err) {
      wx.hideLoading()
      console.error(err)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  },

  onGoRegister() {
    wx.redirectTo({
      url: '/pages/register/index'
    })
  },

  onLoad() {
    // 检查是否已登录
    const player_id = wx.getStorageSync('player_id')
    if (player_id) {
      wx.redirectTo({
        url: '/pages/lobby/index'
      })
    }
  }
})

