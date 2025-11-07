// 排行榜页面
Page({
  data: {
    ranking: [],
    loading: false,
    player_id: ''
  },

  async loadRanking() {
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'history',
        data: {
          action: 'getRanking',
          limit: 100
        }
      })

      if (res.result.code === 0) {
        this.setData({
          ranking: res.result.data.ranking,
          loading: false
        })
      } else {
        wx.showToast({
          title: res.result.message,
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error(err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  onRefresh() {
    this.loadRanking()
  },

  onLoad() {
    const player_id = wx.getStorageSync('player_id')
    this.setData({ player_id })
    this.loadRanking()
  }
})

