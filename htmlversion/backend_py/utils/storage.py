"""
数据存储工具 - 使用 JSON 文件
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import threading

# 数据目录
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# 线程锁，确保并发安全
_locks = {}

def get_lock(collection: str):
    """获取集合的线程锁"""
    if collection not in _locks:
        _locks[collection] = threading.Lock()
    return _locks[collection]

def get_file_path(collection: str) -> Path:
    """获取集合的文件路径"""
    return DATA_DIR / f"{collection}.json"

def load_collection(collection: str) -> List[Dict]:
    """加载集合数据"""
    file_path = get_file_path(collection)
    if not file_path.exists():
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {collection}: {e}")
        return []

def save_collection(collection: str, data: List[Dict]):
    """保存集合数据"""
    file_path = get_file_path(collection)
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        print(f"Error saving {collection}: {e}")
        raise

def generate_id() -> str:
    """生成唯一ID"""
    from datetime import datetime
    import random
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
    random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return f"{timestamp}{random_suffix}"

class Collection:
    """集合操作类"""
    
    def __init__(self, name: str):
        self.name = name
        self.lock = get_lock(name)
    
    def find_one(self, query: Dict) -> Optional[Dict]:
        """查找单个文档"""
        with self.lock:
            data = load_collection(self.name)
            for item in data:
                match = all(item.get(k) == v for k, v in query.items())
                if match:
                    return item.copy()
            return None
    
    def find(self, query: Dict = None) -> List[Dict]:
        """查找多个文档"""
        with self.lock:
            data = load_collection(self.name)
            if query is None:
                return [item.copy() for item in data]
            
            result = []
            for item in data:
                match = all(item.get(k) == v for k, v in query.items())
                if match:
                    result.append(item.copy())
            return result
    
    def find_by_id(self, doc_id: str) -> Optional[Dict]:
        """根据ID查找文档"""
        return self.find_one({"_id": doc_id})
    
    def insert_one(self, document: Dict) -> str:
        """插入单个文档"""
        with self.lock:
            data = load_collection(self.name)
            doc = document.copy()
            
            # 生成ID
            if '_id' not in doc:
                doc['_id'] = generate_id()
            
            # 添加时间戳
            if 'created_at' not in doc:
                doc['created_at'] = datetime.now().isoformat()
            
            data.append(doc)
            save_collection(self.name, data)
            return doc['_id']
    
    def update_one(self, query: Dict, update: Dict) -> bool:
        """更新单个文档"""
        with self.lock:
            data = load_collection(self.name)
            updated = False
            
            for i, item in enumerate(data):
                match = all(item.get(k) == v for k, v in query.items())
                if match:
                    # 处理 $set 操作
                    if '$set' in update:
                        for k, v in update['$set'].items():
                            data[i][k] = v
                    
                    # 处理 $inc 操作
                    if '$inc' in update:
                        for k, v in update['$inc'].items():
                            data[i][k] = data[i].get(k, 0) + v
                    
                    # 处理 $push 操作
                    if '$push' in update:
                        for k, v in update['$push'].items():
                            if k not in data[i]:
                                data[i][k] = []
                            data[i][k].append(v)
                    
                    # 更新时间
                    data[i]['updated_at'] = datetime.now().isoformat()
                    updated = True
                    break
            
            if updated:
                save_collection(self.name, data)
            return updated
    
    def delete_one(self, query: Dict) -> bool:
        """删除单个文档"""
        with self.lock:
            data = load_collection(self.name)
            original_len = len(data)
            
            data = [item for item in data if not all(item.get(k) == v for k, v in query.items())]
            
            if len(data) < original_len:
                save_collection(self.name, data)
                return True
            return False
    
    def count(self, query: Dict = None) -> int:
        """统计文档数量"""
        return len(self.find(query or {}))

def get_collection(name: str) -> Collection:
    """获取集合"""
    return Collection(name)

def init_storage():
    """初始化存储"""
    DATA_DIR.mkdir(exist_ok=True)
    
    # 创建空集合文件（如果不存在）
    collections = ['players', 'rooms', 'matches', 'bp_records', 'player_stats', 'elo_history']
    for col in collections:
        file_path = get_file_path(col)
        if not file_path.exists():
            save_collection(col, [])
    
    print(f"✓ Data storage initialized: {DATA_DIR}")

