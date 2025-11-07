// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        // env: 'cloud1-xxxxx', // 请替换为你的云环境 ID，或注释此行使用默认环境
        traceUser: true
      })
    }

    // 检查是否已登录
    this.checkLogin()
  },

  checkLogin() {
    const player_id = wx.getStorageSync('player_id')
    if (player_id) {
      this.globalData.player_id = player_id
      this.globalData.nickname = wx.getStorageSync('nickname')
    }
  },

  globalData: {
    player_id: '',
    nickname: '',
    version: '1.0.0'
  }
})
