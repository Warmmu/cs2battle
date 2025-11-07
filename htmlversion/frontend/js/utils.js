// 工具函数

// 本地存储管理
const Storage = {
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  get(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  
  remove(key) {
    localStorage.removeItem(key);
  },
  
  clear() {
    localStorage.clear();
  }
};

// 用户信息管理
const User = {
  save(data) {
    Storage.set('player_id', data.player_id);
    Storage.set('nickname', data.nickname);
    if (data.elo) Storage.set('elo', data.elo);
  },
  
  get() {
    return {
      player_id: Storage.get('player_id'),
      nickname: Storage.get('nickname'),
      elo: Storage.get('elo')
    };
  },
  
  isLoggedIn() {
    return !!Storage.get('player_id');
  },
  
  logout() {
    Storage.remove('player_id');
    Storage.remove('nickname');
    Storage.remove('elo');
  }
};

// 显示提示信息
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 显示加载中
function showLoading(message = '加载中...') {
  const existing = document.querySelector('.loading-overlay');
  if (existing) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">${message}</div>
  `;
  document.body.appendChild(overlay);
}

// 隐藏加载中
function hideLoading() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

// 显示确认对话框
function showConfirm(title, message, onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">${title}</h3>
      <p class="modal-message">${message}</p>
      <div class="modal-buttons">
        <button class="btn btn-secondary cancel-btn">取消</button>
        <button class="btn btn-primary confirm-btn">确定</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    modal.remove();
    if (onCancel) onCancel();
  });
  
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    modal.remove();
    if (onConfirm) onConfirm();
  });
  
  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      if (onCancel) onCancel();
    }
  });
}

// 格式化日期
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

// 页面跳转
function navigate(page) {
  window.location.href = page;
}

// 检查登录状态
function checkLogin() {
  if (!User.isLoggedIn()) {
    navigate('index.html');
    return false;
  }
  return true;
}

// 地图名称翻译
const MAP_NAMES = {
  'inferno': '炼狱小镇',
  'mirage': '荒漠迷城',
  'dust2': '炙热沙城2',
  'nuke': '核子危机',
  'overpass': '死城之谜',
  'ancient': '远古遗迹',
  'anubis': '阿努比斯'
};

function getMapName(map) {
  return MAP_NAMES[map] || map;
}

