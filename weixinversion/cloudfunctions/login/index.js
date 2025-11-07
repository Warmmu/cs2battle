// 云函数：玩家登录
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { nickname } = event
  
  try {
    // 查找玩家
    const result = await db.collection('players').where({
      nickname: nickname
    }).get()
    
    if (result.data.length === 0) {
      return {
        code: 1001,
        message: '该昵称未注册，请先注册',
        data: null
      }
    }
    
    const player = result.data[0]
    
    return {
      code: 0,
      message: '登录成功',
      data: {
        player_id: player._id,
        nickname: player.nickname,
        elo: player.elo,
        total_matches: player.total_matches,
        wins: player.wins,
        losses: player.losses
      }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 9999,
      message: '登录失败：' + err.message,
      data: null
    }
  }
}

