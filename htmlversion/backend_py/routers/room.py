"""
房间管理路由
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from utils.storage import get_collection

router = APIRouter()

class JoinRoomRequest(BaseModel):
    player_id: str

class ReadyRequest(BaseModel):
    player_id: str
    room_id: str
    ready: bool

class LeaveRoomRequest(BaseModel):
    player_id: str
    room_id: str

@router.post("/join")
async def join_room(req: JoinRoomRequest):
    """加入房间"""
    try:
        if not req.player_id:
            return {"code": 1001, "message": "缺少玩家ID", "data": None}
        
        players = get_collection('players')
        rooms = get_collection('rooms')
        
        # 获取玩家信息
        player = players.find_by_id(req.player_id)
        if not player:
            return {"code": 1002, "message": "玩家不存在", "data": None}
        
        # 查找可用房间
        all_rooms = rooms.find({"status": "waiting"})
        room = None
        for r in all_rooms:
            if len(r.get('players', [])) < 10:
                room = r
                break
        
        if room:
            # 检查玩家是否已在房间中
            player_exists = any(p['player_id'] == req.player_id for p in room['players'])
            if player_exists:
                return {"code": 0, "message": "已在房间中", "data": room}
            
            # 加入现有房间
            room['players'].append({
                "player_id": req.player_id,
                "nickname": player['nickname'],
                "elo": player['elo'],
                "ready": False,
                "team": None
            })
            
            rooms.update_one(
                {"_id": room['_id']},
                {"$set": {
                    "players": room['players'],
                    "updated_at": datetime.now().isoformat()
                }}
            )
            
            room = rooms.find_by_id(room['_id'])
        else:
            # 创建新房间
            new_room = {
                "status": "waiting",
                "players": [{
                    "player_id": req.player_id,
                    "nickname": player['nickname'],
                    "elo": player['elo'],
                    "ready": False,
                    "team": None
                }],
                "teamA": [],
                "teamB": [],
                "elo_diff": 0,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            room_id = rooms.insert_one(new_room)
            room = rooms.find_by_id(room_id)
        
        return {
            "code": 0,
            "message": "加入房间成功",
            "data": room
        }
    except Exception as e:
        return {"code": 9999, "message": f"加入房间失败：{str(e)}", "data": None}

@router.post("/ready")
async def set_ready(req: ReadyRequest):
    """设置准备状态"""
    try:
        rooms = get_collection('rooms')
        room = rooms.find_by_id(req.room_id)
        
        if not room:
            return {"code": 1003, "message": "房间不存在", "data": None}
        
        # 查找玩家索引
        player_index = -1
        for i, p in enumerate(room['players']):
            if p['player_id'] == req.player_id:
                player_index = i
                break
        
        if player_index == -1:
            return {"code": 1002, "message": "玩家不在房间中", "data": None}
        
        # 更新玩家准备状态
        room['players'][player_index]['ready'] = req.ready
        
        # 检查是否所有人都准备好了
        all_ready = len(room['players']) >= 2 and all(p['ready'] for p in room['players'])
        
        rooms.update_one(
            {"_id": req.room_id},
            {"$set": {
                "players": room['players'],
                "status": "ready" if all_ready else "waiting",
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        return {
            "code": 0,
            "message": "已准备" if req.ready else "取消准备",
            "data": {
                "ready": req.ready,
                "all_ready": all_ready
            }
        }
    except Exception as e:
        return {"code": 9999, "message": f"操作失败：{str(e)}", "data": None}

@router.get("/{room_id}")
async def get_room(room_id: str):
    """获取房间状态"""
    try:
        rooms = get_collection('rooms')
        room = rooms.find_by_id(room_id)
        
        if not room:
            return {"code": 1003, "message": "房间不存在", "data": None}
        
        return {
            "code": 0,
            "message": "获取成功",
            "data": room
        }
    except Exception as e:
        return {"code": 9999, "message": f"获取失败：{str(e)}", "data": None}

@router.get("/")
async def list_rooms():
    """获取可用房间列表"""
    try:
        rooms = get_collection('rooms')
        available_rooms = rooms.find()
        
        # 过滤并排序
        available_rooms = [r for r in available_rooms if r.get('status') in ['waiting', 'ready']]
        available_rooms.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        available_rooms = available_rooms[:10]
        
        room_list = [{
            "_id": room['_id'],
            "player_count": len(room.get('players', [])),
            "status": room.get('status'),
            "created_at": room.get('created_at')
        } for room in available_rooms]
        
        return {
            "code": 0,
            "message": "获取成功",
            "data": room_list
        }
    except Exception as e:
        return {"code": 9999, "message": f"获取失败：{str(e)}", "data": []}

@router.post("/leave")
async def leave_room(req: LeaveRoomRequest):
    """离开房间"""
    try:
        rooms = get_collection('rooms')
        room = rooms.find_by_id(req.room_id)
        
        if not room:
            return {"code": 1003, "message": "房间不存在", "data": None}
        
        # 移除玩家
        new_players = [p for p in room['players'] if p['player_id'] != req.player_id]
        
        if len(new_players) == 0:
            # 房间无人，删除房间
            rooms.delete_one({"_id": req.room_id})
        else:
            # 更新玩家列表
            rooms.update_one(
                {"_id": req.room_id},
                {"$set": {
                    "players": new_players,
                    "status": "waiting",
                    "updated_at": datetime.now().isoformat()
                }}
            )
        
        return {
            "code": 0,
            "message": "已离开房间",
            "data": None
        }
    except Exception as e:
        return {"code": 9999, "message": f"操作失败：{str(e)}", "data": None}

