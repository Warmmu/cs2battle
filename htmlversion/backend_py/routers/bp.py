"""
BP (Ban/Pick) 路由
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from utils.storage import get_collection

router = APIRouter()

# CS2 官方地图池
MAP_POOL = ['inferno', 'mirage', 'dust2', 'nuke', 'overpass', 'ancient', 'anubis']

class StartBPRequest(BaseModel):
    room_id: str

class VoteRequest(BaseModel):
    bp_id: str
    team: str
    map: str
    bp_action: str
    player_id: str

@router.post("/start")
async def start_bp(req: StartBPRequest):
    """开始 BP"""
    try:
        rooms = get_collection('rooms')
        bp_records = get_collection('bp_records')
        
        room = rooms.find_by_id(req.room_id)
        if not room:
            return {"code": 1003, "message": "房间不存在", "data": None}
        
        # 如果房间已经有BP记录，直接返回现有的
        if room.get('bp_id'):
            bp = bp_records.find_by_id(room['bp_id'])
            if bp:
                return {
                    "code": 0,
                    "message": "BP 已存在",
                    "data": {
                        "bp_id": room['bp_id'],
                        "maps": MAP_POOL,
                        "next_action": get_bp_action(bp['current_step'])
                    }
                }
        
        if room['status'] != 'matching':
            return {"code": 1005, "message": "房间状态错误，需先完成匹配", "data": None}
        
        # 创建 BP 记录
        new_bp = {
            "room_id": req.room_id,
            "maps": MAP_POOL[:],
            "available_maps": MAP_POOL[:],
            "bp_history": [],
            "final_map": None,
            "status": "in_progress",
            "current_step": 0,
            "current_votes": {},
            "created_at": datetime.now().isoformat()
        }
        
        bp_id = bp_records.insert_one(new_bp)
        
        # 更新房间状态
        rooms.update_one(
            {"_id": req.room_id},
            {"$set": {
                "status": "bp",
                "bp_id": bp_id,
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        return {
            "code": 0,
            "message": "BP 开始",
            "data": {
                "bp_id": bp_id,
                "maps": MAP_POOL,
                "next_action": get_bp_action(0)
            }
        }
    except Exception as e:
        return {"code": 9999, "message": f"BP开始失败：{str(e)}", "data": None}

@router.post("/vote")
async def vote_bp(req: VoteRequest):
    """BP 投票"""
    try:
        bp_records = get_collection('bp_records')
        rooms = get_collection('rooms')
        matches = get_collection('matches')
        
        bp = bp_records.find_by_id(req.bp_id)
        if not bp:
            return {"code": 1003, "message": "BP 记录不存在", "data": None}
        
        if bp['status'] == 'completed':
            return {"code": 1005, "message": "BP 已完成", "data": None}
        
        # 验证地图是否可用
        if req.map not in bp['available_maps']:
            return {"code": 1001, "message": "地图不可用", "data": None}
        
        # 验证操作是否正确
        expected_action = get_bp_action(bp['current_step'])
        if expected_action['team'] != req.team or expected_action['action'] != req.bp_action:
            return {
                "code": 1005,
                "message": f"当前应该是 {expected_action['team']} 队 {'Ban' if expected_action['action'] == 'ban' else 'Pick'}",
                "data": None
            }
        
        # 获取房间信息，验证玩家权限
        room = rooms.find_by_id(bp['room_id'])
        team_players = room['teamA'] if req.team == 'A' else room['teamB']
        
        if req.player_id not in team_players:
            return {"code": 1006, "message": "您不在当前操作的队伍中", "data": None}
        
        # 投票机制
        current_votes = bp.get('current_votes', {})
        current_votes[req.player_id] = req.map
        
        # 统计投票结果
        vote_counts = {}
        for voted_map in current_votes.values():
            vote_counts[voted_map] = vote_counts.get(voted_map, 0) + 1
        
        # 计算需要的票数
        required_votes = (len(team_players) + 1) // 2
        max_votes = max(vote_counts.values()) if vote_counts else 0
        selected_map = max(vote_counts, key=vote_counts.get) if vote_counts else None
        
        # 更新投票记录
        bp_records.update_one(
            {"_id": req.bp_id},
            {"$set": {
                "current_votes": current_votes,
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        # 检查是否达到所需票数
        if max_votes < required_votes:
            return {
                "code": 0,
                "message": f"已投票 {req.map}，当前进度：{max_votes}/{required_votes}",
                "data": {
                    "votes": current_votes,
                    "vote_counts": vote_counts,
                    "required_votes": required_votes,
                    "waiting_for_votes": True
                }
            }
        
        # 达到所需票数，执行BP
        new_history = bp['bp_history'] + [{
            "team": req.team,
            "action": req.bp_action,
            "map": selected_map,
            "votes": vote_counts,
            "timestamp": datetime.now().isoformat()
        }]
        
        new_available_maps = [m for m in bp['available_maps'] if m != selected_map]
        new_step = bp['current_step'] + 1
        
        # 检查是否完成 BP
        final_map = None
        status = 'in_progress'
        
        # BP 流程：A Ban -> B Ban -> A Pick
        if new_step >= 3 or len(new_available_maps) == 1:
            final_map = selected_map if req.bp_action == 'pick' else new_available_maps[0]
            status = 'completed'
            
            # 创建比赛记录
            matches.insert_one({
                "room_id": bp['room_id'],
                "date": datetime.now().isoformat(),
                "map": final_map,
                "teamA": room['teamA'],
                "teamB": room['teamB'],
                "score_a": 0,
                "score_b": 0,
                "winner": None,
                "mvp_id": None,
                "status": "playing",
                "player_stats": [],
                "created_at": datetime.now().isoformat(),
                "finished_at": None
            })
            
            # 更新房间状态
            rooms.update_one(
                {"_id": bp['room_id']},
                {"$set": {
                    "status": "playing",
                    "updated_at": datetime.now().isoformat()
                }}
            )
        
        # 更新 BP 记录
        bp_records.update_one(
            {"_id": req.bp_id},
            {"$set": {
                "bp_history": new_history,
                "available_maps": new_available_maps,
                "current_step": new_step,
                "current_votes": {},
                "final_map": final_map,
                "status": status,
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        return {
            "code": 0,
            "message": f"{req.team} 队 {'Ban 掉' if req.bp_action == 'ban' else 'Pick'} {selected_map}",
            "data": {
                "available_maps": new_available_maps,
                "final_map": final_map,
                "completed": status == 'completed',
                "next_action": get_bp_action(new_step) if status == 'in_progress' else None,
                "selected_map": selected_map
            }
        }
    except Exception as e:
        return {"code": 9999, "message": f"BP投票失败：{str(e)}", "data": None}

@router.get("/{bp_id}")
async def get_bp_status(bp_id: str):
    """获取 BP 状态"""
    try:
        bp_records = get_collection('bp_records')
        bp = bp_records.find_by_id(bp_id)
        
        if not bp:
            return {"code": 1003, "message": "BP 记录不存在", "data": None}
        
        return {
            "code": 0,
            "message": "获取成功",
            "data": {
                **bp,
                "next_action": get_bp_action(bp['current_step']) if bp['status'] == 'in_progress' else None,
                "server_time": datetime.now().isoformat()
            }
        }
    except Exception as e:
        return {"code": 9999, "message": f"获取失败：{str(e)}", "data": None}

def get_bp_action(step: int) -> dict:
    """获取当前 BP 步骤应该的操作"""
    bp_flow = [
        {"team": "A", "action": "ban", "desc": "A队 Ban 地图"},
        {"team": "B", "action": "ban", "desc": "B队 Ban 地图"},
        {"team": "A", "action": "pick", "desc": "A队 Pick 地图"}
    ]
    
    if step < len(bp_flow):
        return bp_flow[step]
    return None

