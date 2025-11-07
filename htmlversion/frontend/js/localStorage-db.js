// 本地存储数据库模拟
// 用于替代后端数据库，将所有数据保存在浏览器 localStorage 中

class LocalDB {
  constructor() {
    this.initDB();
  }
  
  // 初始化数据库结构
  initDB() {
    if (!localStorage.getItem('cs2_db')) {
      const db = {
        players: [],
        rooms: [],
        matches: [],
        bp_sessions: [],
        player_stats: [],
        elo_history: [],
        version: '1.0'
      };
      this.saveDB(db);
    }
  }
  
  // 获取整个数据库
  getDB() {
    const data = localStorage.getItem('cs2_db');
    return data ? JSON.parse(data) : null;
  }
  
  // 保存整个数据库
  saveDB(db) {
    localStorage.setItem('cs2_db', JSON.stringify(db));
  }
  
  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // ========== 玩家相关 ==========
  
  // 注册玩家
  registerPlayer(nickname, steam_id = '') {
    const db = this.getDB();
    
    // 检查昵称是否已存在
    const existing = db.players.find(p => p.nickname === nickname);
    if (existing) {
      return { code: 1002, message: '昵称已被使用', data: null };
    }
    
    const player = {
      _id: this.generateId(),
      nickname,
      steam_id,
      elo: 1000,
      total_matches: 0,
      wins: 0,
      losses: 0,
      total_kills: 0,
      total_deaths: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.players.push(player);
    this.saveDB(db);
    
    return { code: 0, message: '注册成功', data: player };
  }
  
  // 登录玩家
  loginPlayer(nickname) {
    const db = this.getDB();
    const player = db.players.find(p => p.nickname === nickname);
    
    if (!player) {
      return { code: 1001, message: '昵称未注册', data: null };
    }
    
    return { code: 0, message: '登录成功', data: player };
  }
  
  // 获取玩家信息
  getPlayer(player_id) {
    const db = this.getDB();
    const player = db.players.find(p => p._id === player_id);
    
    if (!player) {
      return { code: 1003, message: '玩家不存在', data: null };
    }
    
    return { code: 0, message: '获取成功', data: player };
  }
  
  // 更新玩家 ELO
  updatePlayerElo(player_id, newElo, statsUpdate = {}) {
    const db = this.getDB();
    const player = db.players.find(p => p._id === player_id);
    
    if (!player) {
      return { code: 1003, message: '玩家不存在', data: null };
    }
    
    player.elo = newElo;
    player.updated_at = new Date().toISOString();
    
    // 更新统计数据
    if (statsUpdate.total_matches !== undefined) player.total_matches += statsUpdate.total_matches;
    if (statsUpdate.wins !== undefined) player.wins += statsUpdate.wins;
    if (statsUpdate.losses !== undefined) player.losses += statsUpdate.losses;
    if (statsUpdate.total_kills !== undefined) player.total_kills += statsUpdate.total_kills;
    if (statsUpdate.total_deaths !== undefined) player.total_deaths += statsUpdate.total_deaths;
    
    this.saveDB(db);
    
    return { code: 0, message: '更新成功', data: player };
  }
  
  // 获取排行榜
  getRanking() {
    const db = this.getDB();
    const ranking = db.players
      .filter(p => p.total_matches > 0)
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 100);
    
    return { code: 0, message: '获取成功', data: ranking };
  }
  
  // ========== 房间相关 ==========
  
  // 加入或创建房间
  joinRoom(player_id) {
    const db = this.getDB();
    const player = db.players.find(p => p._id === player_id);
    
    if (!player) {
      return { code: 1003, message: '玩家不存在', data: null };
    }
    
    // 查找是否已在某个房间
    let room = db.rooms.find(r => 
      r.players.some(p => p.player_id === player_id) && 
      r.status !== 'finished'
    );
    
    if (room) {
      return { code: 0, message: '已在房间中', data: room };
    }
    
    // 查找可加入的房间
    room = db.rooms.find(r => 
      r.status === 'waiting' && 
      r.players.length < 10
    );
    
    if (!room) {
      // 创建新房间
      room = {
        _id: this.generateId(),
        players: [],
        status: 'waiting',
        teamA: [],
        teamB: [],
        bp_id: null,
        match_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.rooms.push(room);
    }
    
    // 添加玩家到房间
    room.players.push({
      player_id: player._id,
      nickname: player.nickname,
      elo: player.elo,
      ready: false
    });
    
    room.updated_at = new Date().toISOString();
    this.saveDB(db);
    
    return { code: 0, message: '加入成功', data: room };
  }
  
  // 设置准备状态
  setReady(player_id, room_id, ready) {
    const db = this.getDB();
    const room = db.rooms.find(r => r._id === room_id);
    
    if (!room) {
      return { code: 1003, message: '房间不存在', data: null };
    }
    
    const player = room.players.find(p => p.player_id === player_id);
    if (!player) {
      return { code: 1003, message: '玩家不在房间中', data: null };
    }
    
    player.ready = ready;
    room.updated_at = new Date().toISOString();
    
    // 检查是否所有人都准备好了
    if (room.players.length >= 2 && room.players.every(p => p.ready)) {
      room.status = 'ready';
    } else {
      room.status = 'waiting';
    }
    
    this.saveDB(db);
    
    return { code: 0, message: ready ? '已准备' : '取消准备', data: room };
  }
  
  // 获取房间状态
  getRoomStatus(room_id) {
    const db = this.getDB();
    const room = db.rooms.find(r => r._id === room_id);
    
    if (!room) {
      return { code: 1003, message: '房间不存在', data: null };
    }
    
    return { code: 0, message: '获取成功', data: room };
  }
  
  // 获取可用房间列表
  getAvailableRooms() {
    const db = this.getDB();
    const rooms = db.rooms
      .filter(r => r.status === 'waiting' && r.players.length < 10)
      .map(r => ({
        _id: r._id,
        player_count: r.players.length,
        status: r.status
      }));
    
    return { code: 0, message: '获取成功', data: rooms };
  }
  
  // 离开房间
  leaveRoom(player_id, room_id) {
    const db = this.getDB();
    const room = db.rooms.find(r => r._id === room_id);
    
    if (!room) {
      return { code: 1003, message: '房间不存在', data: null };
    }
    
    room.players = room.players.filter(p => p.player_id !== player_id);
    
    // 如果房间没人了，删除房间
    if (room.players.length === 0) {
      db.rooms = db.rooms.filter(r => r._id !== room_id);
    } else {
      room.updated_at = new Date().toISOString();
    }
    
    this.saveDB(db);
    
    return { code: 0, message: '已离开房间', data: null };
  }
  
  // ========== 匹配相关 ==========
  
  // 开始匹配（分队）
  startMatch(room_id) {
    const db = this.getDB();
    const room = db.rooms.find(r => r._id === room_id);
    
    if (!room) {
      return { code: 1003, message: '房间不存在', data: null };
    }
    
    if (room.players.length < 2) {
      return { code: 1004, message: '玩家数量不足', data: null };
    }
    
    // 按 ELO 排序进行蛇形分队
    const sortedPlayers = [...room.players].sort((a, b) => b.elo - a.elo);
    const teamA = [];
    const teamB = [];
    
    sortedPlayers.forEach((player, index) => {
      if (index % 4 === 0 || index % 4 === 3) {
        teamA.push(player.player_id);
      } else {
        teamB.push(player.player_id);
      }
    });
    
    room.teamA = teamA;
    room.teamB = teamB;
    room.status = 'matching';
    room.updated_at = new Date().toISOString();
    
    this.saveDB(db);
    
    return { code: 0, message: '匹配成功', data: room };
  }
  
  // ========== BP 相关 ==========
  
  // 开始 BP
  startBP(room_id) {
    const db = this.getDB();
    const room = db.rooms.find(r => r._id === room_id);
    
    if (!room) {
      return { code: 1003, message: '房间不存在', data: null };
    }
    
    // 如果已有 BP，返回现有的
    if (room.bp_id) {
      const bp = db.bp_sessions.find(b => b._id === room.bp_id);
      if (bp) {
        return { code: 0, message: 'BP 已存在', data: { bp_id: bp._id } };
      }
    }
    
    const maps = ['inferno', 'mirage', 'dust2', 'nuke', 'overpass', 'ancient', 'anubis'];
    
    const bp = {
      _id: this.generateId(),
      room_id: room._id,
      maps: maps,
      available_maps: [...maps],
      banned_maps: [],
      final_map: null,
      bp_history: [],
      current_step: 0,
      next_action: { team: 'A', action: 'ban' },
      current_votes: {},
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.bp_sessions.push(bp);
    room.bp_id = bp._id;
    room.status = 'bp';
    
    this.saveDB(db);
    
    return { code: 0, message: 'BP 已开始', data: { bp_id: bp._id } };
  }
  
  // BP 投票
  voteBP(bp_id, team, map, action, player_id) {
    const db = this.getDB();
    const bp = db.bp_sessions.find(b => b._id === bp_id);
    
    if (!bp) {
      return { code: 1003, message: 'BP 会话不存在', data: null };
    }
    
    if (bp.status !== 'in_progress') {
      return { code: 1004, message: 'BP 已完成', data: null };
    }
    
    if (!bp.available_maps.includes(map)) {
      return { code: 1004, message: '地图不可用', data: null };
    }
    
    // 记录投票
    bp.current_votes[player_id] = map;
    
    // 获取房间信息
    const room = db.rooms.find(r => r._id === bp.room_id);
    const teamPlayers = team === 'A' ? room.teamA : room.teamB;
    const requiredVotes = Math.ceil(teamPlayers.length / 2);
    
    // 统计票数
    const voteCounts = {};
    Object.entries(bp.current_votes).forEach(([pid, m]) => {
      if (teamPlayers.includes(pid)) {
        voteCounts[m] = (voteCounts[m] || 0) + 1;
      }
    });
    
    // 检查是否有地图达到所需票数
    const winningMap = Object.entries(voteCounts).find(([m, count]) => count >= requiredVotes);
    
    if (winningMap) {
      const selectedMap = winningMap[0];
      
      // 记录历史
      bp.bp_history.push({
        team,
        action,
        map: selectedMap,
        timestamp: new Date().toISOString()
      });
      
      if (action === 'ban') {
        // Ban 地图
        bp.available_maps = bp.available_maps.filter(m => m !== selectedMap);
        bp.banned_maps.push(selectedMap);
        
        // 检查是否只剩一张地图
        if (bp.available_maps.length === 1) {
          bp.final_map = bp.available_maps[0];
          bp.status = 'completed';
          bp.next_action = null;
          
          // 创建比赛
          this.createMatch(bp.room_id, bp.final_map);
        } else {
          // 继续下一步
          bp.current_step++;
          bp.next_action = this.getNextBPAction(bp.current_step);
        }
      } else {
        // Pick 地图
        bp.final_map = selectedMap;
        bp.status = 'completed';
        bp.next_action = null;
        
        // 创建比赛
        this.createMatch(bp.room_id, bp.final_map);
      }
      
      // 清空投票
      bp.current_votes = {};
    }
    
    bp.updated_at = new Date().toISOString();
    this.saveDB(db);
    
    return { code: 0, message: '投票成功', data: bp };
  }
  
  // 获取下一个 BP 动作
  getNextBPAction(step) {
    const sequence = [
      { team: 'A', action: 'ban' },
      { team: 'B', action: 'ban' },
      { team: 'A', action: 'ban' },
      { team: 'B', action: 'ban' },
      { team: 'A', action: 'ban' },
      { team: 'B', action: 'ban' }
    ];
    
    return sequence[step] || null;
  }
  
  // 获取 BP 状态
  getBPStatus(bp_id) {
    const db = this.getDB();
    const bp = db.bp_sessions.find(b => b._id === bp_id);
    
    if (!bp) {
      return { code: 1003, message: 'BP 会话不存在', data: null };
    }
    
    return { code: 0, message: '获取成功', data: bp };
  }
  
  // ========== 比赛相关 ==========
  
  // 创建比赛
  createMatch(room_id, map) {
    const db = this.getDB();
    const room = db.rooms.find(r => r._id === room_id);
    
    if (!room) {
      return { code: 1003, message: '房间不存在', data: null };
    }
    
    const match = {
      _id: this.generateId(),
      room_id: room._id,
      map: map,
      teamA: room.teamA,
      teamB: room.teamB,
      score_a: 0,
      score_b: 0,
      winner: null,
      player_stats: [],
      status: 'playing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      finished_at: null
    };
    
    db.matches.push(match);
    room.match_id = match._id;
    room.status = 'playing';
    
    this.saveDB(db);
    
    return { code: 0, message: '比赛已创建', data: match };
  }
  
  // 获取比赛信息
  getMatch(room_id) {
    const db = this.getDB();
    const match = db.matches.find(m => m.room_id === room_id && m.status === 'playing');
    
    if (!match) {
      return { code: 1003, message: '比赛不存在', data: null };
    }
    
    return { code: 0, message: '获取成功', data: match };
  }
  
  // 更新比赛数据（实时保存）
  updateMatch(match_id, score_a, score_b, player_stats) {
    const db = this.getDB();
    const match = db.matches.find(m => m._id === match_id);
    
    if (!match) {
      return { code: 1003, message: '比赛不存在', data: null };
    }
    
    match.score_a = score_a || 0;
    match.score_b = score_b || 0;
    match.player_stats = player_stats || [];
    match.updated_at = new Date().toISOString();
    
    this.saveDB(db);
    
    return { code: 0, message: '数据已保存', data: match };
  }
  
  // 完成比赛
  finishMatch(match_id, score_a, score_b, player_stats) {
    const db = this.getDB();
    const match = db.matches.find(m => m._id === match_id);
    
    if (!match) {
      return { code: 1003, message: '比赛不存在', data: null };
    }
    
    // 判断胜者
    const winner = score_a > score_b ? 'A' : (score_b > score_a ? 'B' : 'draw');
    
    match.score_a = score_a;
    match.score_b = score_b;
    match.player_stats = player_stats;
    match.winner = winner;
    match.status = 'finished';
    match.finished_at = new Date().toISOString();
    
    // 计算 ELO 变化
    const eloChanges = this.calculateELO(match, db);
    
    // 更新玩家统计
    eloChanges.forEach(change => {
      const stat = player_stats.find(s => s.player_id === change.player_id);
      const isWinner = (winner === 'A' && match.teamA.includes(change.player_id)) ||
                      (winner === 'B' && match.teamB.includes(change.player_id));
      
      this.updatePlayerElo(change.player_id, change.new_elo, {
        total_matches: 1,
        wins: isWinner && winner !== 'draw' ? 1 : 0,
        losses: !isWinner && winner !== 'draw' ? 1 : 0,
        total_kills: stat.kills,
        total_deaths: stat.deaths
      });
      
      // 记录 ELO 历史
      db.elo_history.push({
        _id: this.generateId(),
        player_id: change.player_id,
        match_id: match_id,
        elo_before: change.old_elo,
        elo_after: change.new_elo,
        elo_change: change.elo_change,
        reason: isWinner ? 'win' : (winner === 'draw' ? 'draw' : 'loss'),
        created_at: new Date().toISOString()
      });
      
      // 保存玩家统计
      db.player_stats.push({
        _id: this.generateId(),
        match_id: match_id,
        player_id: change.player_id,
        team: match.teamA.includes(change.player_id) ? 'A' : 'B',
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists || 0,
        kd_ratio: stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills,
        elo_before: change.old_elo,
        elo_after: change.new_elo,
        elo_change: change.elo_change,
        created_at: new Date().toISOString()
      });
    });
    
    // 更新房间状态
    const room = db.rooms.find(r => r._id === match.room_id);
    if (room) {
      room.status = 'finished';
      room.updated_at = new Date().toISOString();
    }
    
    this.saveDB(db);
    
    return { code: 0, message: '提交成功', data: { elo_changes: eloChanges } };
  }
  
  // 计算 ELO 变化
  calculateELO(match, db) {
    const changes = [];
    const allPlayerIds = [...match.teamA, ...match.teamB];
    
    // 获取所有玩家
    const players = db.players.filter(p => allPlayerIds.includes(p._id));
    
    // 计算队伍平均 ELO
    const teamAPlayers = players.filter(p => match.teamA.includes(p._id));
    const teamBPlayers = players.filter(p => match.teamB.includes(p._id));
    
    const avgEloA = teamAPlayers.reduce((sum, p) => sum + p.elo, 0) / teamAPlayers.length;
    const avgEloB = teamBPlayers.reduce((sum, p) => sum + p.elo, 0) / teamBPlayers.length;
    
    // 计算期望胜率
    const expectedA = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400));
    const expectedB = 1 - expectedA;
    
    // 实际得分
    const actualA = match.winner === 'A' ? 1 : (match.winner === 'draw' ? 0.5 : 0);
    const actualB = 1 - actualA;
    
    // 计算每个玩家的 ELO 变化
    players.forEach(player => {
      const stat = match.player_stats.find(s => s.player_id === player._id);
      const isTeamA = match.teamA.includes(player._id);
      
      // K 因子
      let K = 32;
      if (player.elo < 1200) K = 40;
      else if (player.elo > 1800) K = 24;
      
      // 基础 ELO 变化
      const expected = isTeamA ? expectedA : expectedB;
      const actual = isTeamA ? actualA : actualB;
      let eloChange = K * (actual - expected);
      
      // KD 修正
      if (stat) {
        const kd = stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills;
        if (kd > 1.5) {
          eloChange *= 1.2;
        } else if (kd < 0.8) {
          eloChange *= 0.8;
        }
      }
      
      eloChange = Math.round(eloChange);
      const newElo = Math.max(0, player.elo + eloChange);
      
      changes.push({
        player_id: player._id,
        nickname: player.nickname,
        old_elo: player.elo,
        new_elo: newElo,
        elo_change: eloChange
      });
    });
    
    return changes;
  }
  
  // ========== 历史记录相关 ==========
  
  // 获取玩家历史记录
  getPlayerHistory(player_id) {
    const db = this.getDB();
    
    const stats = db.player_stats
      .filter(s => s.player_id === player_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);
    
    // 填充比赛信息
    const history = stats.map(stat => {
      const match = db.matches.find(m => m._id === stat.match_id);
      return {
        ...stat,
        match: match
      };
    });
    
    return { code: 0, message: '获取成功', data: history };
  }
  
  // 获取玩家详细信息
  getPlayerInfo(player_id) {
    const db = this.getDB();
    const player = db.players.find(p => p._id === player_id);
    
    if (!player) {
      return { code: 1003, message: '玩家不存在', data: null };
    }
    
    // 获取 ELO 历史
    const eloHistory = db.elo_history
      .filter(h => h.player_id === player_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        player,
        elo_history: eloHistory
      }
    };
  }
  
  // 清空所有数据（用于测试）
  clearAll() {
    localStorage.removeItem('cs2_db');
    this.initDB();
    return { code: 0, message: '数据已清空', data: null };
  }
}

// 创建全局实例
const localDB = new LocalDB();

