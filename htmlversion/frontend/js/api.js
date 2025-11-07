// API 调用封装
const API_BASE_URL = 'http://localhost:3000/api';

class API {
  // 通用请求方法
  static async request(url, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('API 请求失败:', err);
      return {
        code: 9999,
        message: '网络请求失败：' + err.message,
        data: null
      };
    }
  }
  
  // GET 请求
  static async get(url) {
    return this.request(url, { method: 'GET' });
  }
  
  // POST 请求
  static async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // 认证相关
  static auth = {
    register: (nickname, steam_id = '') => 
      API.post('/auth/register', { nickname, steam_id }),
    
    login: (nickname) => 
      API.post('/auth/login', { nickname })
  }
  
  // 房间相关
  static room = {
    join: (player_id) => 
      API.post('/room/join', { player_id }),
    
    ready: (player_id, room_id, ready) => 
      API.post('/room/ready', { player_id, room_id, ready }),
    
    getStatus: (room_id) => 
      API.get(`/room/${room_id}`),
    
    getAvailable: () => 
      API.get('/room'),
    
    leave: (player_id, room_id) => 
      API.post('/room/leave', { player_id, room_id })
  }
  
  // 匹配相关
  static match = {
    start: (room_id) => 
      API.post('/match/start', { room_id })
  }
  
  // BP 相关
  static bp = {
    start: (room_id) => 
      API.post('/bp/start', { room_id }),
    
    vote: (bp_id, team, map, bp_action, player_id) => 
      API.post('/bp/vote', { bp_id, team, map, bp_action, player_id }),
    
    getStatus: (bp_id) => 
      API.get(`/bp/${bp_id}`)
  }
  
  // 比赛相关
  static submit = {
    update: (match_id, score_a, score_b, player_stats) => 
      API.post('/submit/update', { match_id, score_a, score_b, player_stats }),
    
    finish: (match_id, score_a, score_b, player_stats) => 
      API.post('/submit/finish', { match_id, score_a, score_b, player_stats }),
    
    getMatch: (room_id) => 
      API.get(`/submit/${room_id}`)
  }
  
  // 历史记录相关
  static history = {
    getPlayer: (player_id) => 
      API.get(`/history/player/${player_id}`),
    
    getRanking: () => 
      API.get('/history/ranking'),
    
    getPlayerInfo: (player_id) => 
      API.get(`/history/player-info/${player_id}`)
  }
}

