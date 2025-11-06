// 云函数：房间管理
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'join':
        return await joinRoom(event)
      case 'ready':
        return await setReady(event)
      case 'getRoomStatus':
        return await getRoomStatus(event)
      case 'leave':
        return await leaveRoom(event)
      default:
        return { code: 1001, message: '无效的操作', data: null }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 9999,
      message: '操作失败：' + err.message,
      data: null
    }
  }
}

// 加入房间
async function joinRoom(event) {
  const { player_id } = event
  
  // 获取玩家信息
  const playerRes = await db.collection('players').doc(player_id).get()
  if (!playerRes.data) {
    return { code: 1002, message: '玩家不存在', data: null }
  }
  
  const player = playerRes.data
  
  // 查找可用房间（状态为 waiting 且人数未满）
  const roomRes = await db.collection('rooms').where({
    status: 'waiting'
  }).get()
  
  let room = null
  
  if (roomRes.data.length > 0) {
    // 找到第一个未满的房间
    room = roomRes.data.find(r => r.players.length < 10) // 最多10人
    
    if (room) {
      // 检查玩家是否已在房间中
      const playerExists = room.players.some(p => p.player_id === player_id)
      if (playerExists) {
        return { code: 0, message: '已在房间中', data: room }
      }
      
      // 加入现有房间
      await db.collection('rooms').doc(room._id).update({
        data: {
          players: _.push({
            player_id: player_id,
            nickname: player.nickname,
            elo: player.elo,
            ready: false,
            team: null
          }),
          updated_at: db.serverDate()
        }
      })
      
      room._id = room._id
    }
  }
  
  if (!room) {
    // 创建新房间
    const result = await db.collection('rooms').add({
      data: {
        status: 'waiting',
        players: [{
          player_id: player_id,
          nickname: player.nickname,
          elo: player.elo,
          ready: false,
          team: null
        }],
        teamA: [],
        teamB: [],
        elo_diff: 0,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })
    
    room = { _id: result._id }
  }
  
  // 获取更新后的房间信息
  const updatedRoom = await db.collection('rooms').doc(room._id).get()
  
  return {
    code: 0,
    message: '加入房间成功',
    data: updatedRoom.data
  }
}

// 设置准备状态
async function setReady(event) {
  const { player_id, ready, room_id } = event
  
  const roomRes = await db.collection('rooms').doc(room_id).get()
  if (!roomRes.data) {
    return { code: 1003, message: '房间不存在', data: null }
  }
  
  const room = roomRes.data
  const playerIndex = room.players.findIndex(p => p.player_id === player_id)
  
  if (playerIndex === -1) {
    return { code: 1002, message: '玩家不在房间中', data: null }
  }
  
  room.players[playerIndex].ready = ready
  
  // 检查是否所有人都准备好了（单人测试模式：1人即可）
  const allReady = room.players.length >= 1 && room.players.every(p => p.ready)
  
  await db.collection('rooms').doc(room_id).update({
    data: {
      players: room.players,
      status: allReady ? 'ready' : 'waiting',
      updated_at: db.serverDate()
    }
  })
  
  return {
    code: 0,
    message: ready ? '已准备' : '取消准备',
    data: {
      ready: ready,
      all_ready: allReady
    }
  }
}

// 获取房间状态
async function getRoomStatus(event) {
  const { room_id } = event
  
  const roomRes = await db.collection('rooms').doc(room_id).get()
  if (!roomRes.data) {
    return { code: 1003, message: '房间不存在', data: null }
  }
  
  return {
    code: 0,
    message: '获取成功',
    data: roomRes.data
  }
}

// 离开房间
async function leaveRoom(event) {
  const { player_id, room_id } = event
  
  const roomRes = await db.collection('rooms').doc(room_id).get()
  if (!roomRes.data) {
    return { code: 1003, message: '房间不存在', data: null }
  }
  
  const room = roomRes.data
  const newPlayers = room.players.filter(p => p.player_id !== player_id)
  
  if (newPlayers.length === 0) {
    // 房间无人，删除房间
    await db.collection('rooms').doc(room_id).remove()
  } else {
    // 更新玩家列表
    await db.collection('rooms').doc(room_id).update({
      data: {
        players: newPlayers,
        status: 'waiting',
        updated_at: db.serverDate()
      }
    })
  }
  
  return {
    code: 0,
    message: '已离开房间',
    data: null
  }
}

