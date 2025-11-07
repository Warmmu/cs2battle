// API 调用封装 - 调用后端 API
const BASE_URL = '';  // 空字符串表示使用当前域名

class API {
  // HTTP 请求封装
  static async request(url, options = {}) {
    try {
      const response = await fetch(BASE_URL + url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return { code: 9999, message: '网络请求失败：' + error.message, data: null };
    }
  }
  
  // 认证相关
  static auth = {
    register: async (nickname, steam_id = '') => {
      return await API.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nickname, steam_id })
      });
    },
    
    login: async (nickname) => {
      return await API.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ nickname })
      });
    }
  }
  
  // 房间相关
  static room = {
    join: async (player_id) => {
      return await API.request('/api/room/join', {
        method: 'POST',
        body: JSON.stringify({ player_id })
      });
    },
    
    ready: async (player_id, room_id, ready) => {
      return await API.request('/api/room/ready', {
        method: 'POST',
        body: JSON.stringify({ player_id, room_id, ready })
      });
    },
    
    getStatus: async (room_id) => {
      return await API.request(`/api/room/${room_id}`);
    },
    
    getAvailable: async () => {
      return await API.request('/api/room/');
    },
    
    leave: async (player_id, room_id) => {
      return await API.request('/api/room/leave', {
        method: 'POST',
        body: JSON.stringify({ player_id, room_id })
      });
    }
  }
  
  // 匹配相关
  static match = {
    start: async (room_id) => {
      return await API.request('/api/match/start', {
        method: 'POST',
        body: JSON.stringify({ room_id })
      });
    }
  }
  
  // BP 相关
  static bp = {
    start: async (room_id) => {
      return await API.request('/api/bp/start', {
        method: 'POST',
        body: JSON.stringify({ room_id })
      });
    },
    
    vote: async (bp_id, team, map, bp_action, player_id) => {
      return await API.request('/api/bp/vote', {
        method: 'POST',
        body: JSON.stringify({ bp_id, team, map, bp_action, player_id })
      });
    },
    
    getStatus: async (bp_id) => {
      return await API.request(`/api/bp/${bp_id}`);
    }
  }
  
  // 比赛相关
  static submit = {
    update: async (match_id, score_a, score_b, player_stats) => {
      return await API.request('/api/submit/update', {
        method: 'POST',
        body: JSON.stringify({ match_id, score_a, score_b, player_stats })
      });
    },
    
    finish: async (match_id, score_a, score_b, player_stats) => {
      return await API.request('/api/submit/finish', {
        method: 'POST',
        body: JSON.stringify({ match_id, score_a, score_b, player_stats })
      });
    },
    
    getMatch: async (room_id) => {
      return await API.request(`/api/submit/${room_id}`);
    }
  }
  
  // 历史记录相关
  static history = {
    getPlayer: async (player_id) => {
      return await API.request(`/api/history/player/${player_id}`);
    },
    
    getRanking: async () => {
      return await API.request('/api/history/ranking');
    },
    
    getPlayerInfo: async (player_id) => {
      return await API.request(`/api/history/player-info/${player_id}`);
    }
  }
}

