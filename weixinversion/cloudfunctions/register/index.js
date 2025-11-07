// 云函数：玩家注册
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { nickname, steam_id, avatar } = event
  
  try {
    // 检查昵称是否已存在
    const existCheck = await db.collection('players').where({
      nickname: nickname
    }).get()
    
    if (existCheck.data.length > 0) {
      return {
        code: 1001,
        message: '昵称已存在',
        data: null
      }
    }
    
    // 创建新玩家
    const result = await db.collection('players').add({
      data: {
        nickname: nickname,
        steam_id: steam_id || null,
        avatar: avatar || null,
        elo: 1000,
        total_matches: 0,
        wins: 0,
        losses: 0,
        total_kills: 0,
        total_deaths: 0,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '注册成功',
      data: {
        player_id: result._id,
        nickname: nickname,
        elo: 1000
      }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 9999,
      message: '注册失败：' + err.message,
      data: null
    }
  }
}

