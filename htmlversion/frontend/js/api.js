// API 调用封装 - 使用本地存储
// 注意：确保 localStorage-db.js 已加载

class API {
  // 模拟异步延迟
  static async delay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 认证相关
  static auth = {
    register: async (nickname, steam_id = '') => {
      await API.delay(200);
      return localDB.registerPlayer(nickname, steam_id);
    },
    
    login: async (nickname) => {
      await API.delay(200);
      return localDB.loginPlayer(nickname);
    }
  }
  
  // 房间相关
  static room = {
    join: async (player_id) => {
      await API.delay(150);
      return localDB.joinRoom(player_id);
    },
    
    ready: async (player_id, room_id, ready) => {
      await API.delay(100);
      return localDB.setReady(player_id, room_id, ready);
    },
    
    getStatus: async (room_id) => {
      await API.delay(50);
      return localDB.getRoomStatus(room_id);
    },
    
    getAvailable: async () => {
      await API.delay(100);
      return localDB.getAvailableRooms();
    },
    
    leave: async (player_id, room_id) => {
      await API.delay(100);
      return localDB.leaveRoom(player_id, room_id);
    }
  }
  
  // 匹配相关
  static match = {
    start: async (room_id) => {
      await API.delay(200);
      return localDB.startMatch(room_id);
    }
  }
  
  // BP 相关
  static bp = {
    start: async (room_id) => {
      await API.delay(150);
      return localDB.startBP(room_id);
    },
    
    vote: async (bp_id, team, map, bp_action, player_id) => {
      await API.delay(100);
      return localDB.voteBP(bp_id, team, map, bp_action, player_id);
    },
    
    getStatus: async (bp_id) => {
      await API.delay(50);
      return localDB.getBPStatus(bp_id);
    }
  }
  
  // 比赛相关
  static submit = {
    update: async (match_id, score_a, score_b, player_stats) => {
      await API.delay(50);
      return localDB.updateMatch(match_id, score_a, score_b, player_stats);
    },
    
    finish: async (match_id, score_a, score_b, player_stats) => {
      await API.delay(200);
      return localDB.finishMatch(match_id, score_a, score_b, player_stats);
    },
    
    getMatch: async (room_id) => {
      await API.delay(50);
      return localDB.getMatch(room_id);
    }
  }
  
  // 历史记录相关
  static history = {
    getPlayer: async (player_id) => {
      await API.delay(100);
      return localDB.getPlayerHistory(player_id);
    },
    
    getRanking: async () => {
      await API.delay(100);
      return localDB.getRanking();
    },
    
    getPlayerInfo: async (player_id) => {
      await API.delay(100);
      return localDB.getPlayerInfo(player_id);
    }
  }
}

