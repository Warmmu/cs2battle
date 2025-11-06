// 历史战绩页面
Page({
  data: {
    player_id: '',
    matches: [],
    page: 1,
    limit: 10,
    total: 0,
    loading: false,
    hasMore: true
  },

  async loadHistory() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'history',
        data: {
          action: 'getPlayerHistory',
          player_id: this.data.player_id,
          page: this.data.page,
          limit: this.data.limit
        }
      })

      if (res.result.code === 0) {
        const { matches, total } = res.result.data
        const allMatches = [...this.data.matches, ...matches]
        
        this.setData({
          matches: allMatches,
          total: total,
          hasMore: allMatches.length < total,
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

  onViewDetail(e) {
    const { matchId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/match-detail/index?match_id=${matchId}`
    })
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({
        page: this.data.page + 1
      }, () => {
        this.loadHistory()
      })
    }
  },

  onLoad() {
    const player_id = wx.getStorageSync('player_id')
    
    if (!player_id) {
      wx.redirectTo({
        url: '/pages/register/index'
      })
      return
    }

    this.setData({ player_id })
    this.loadHistory()
  }
})

