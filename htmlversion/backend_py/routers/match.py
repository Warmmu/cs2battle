"""
匹配分队路由
"""
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from utils.storage import get_collection
from typing import List, Dict

router = APIRouter()

class StartMatchRequest(BaseModel):
    room_id: str

@router.post("/start")
async def start_match(req: StartMatchRequest):
    """开始匹配"""
    try:
        rooms = get_collection('rooms')
        room = rooms.find_by_id(req.room_id)
        
        if not room:
            return {"code": 1003, "message": "房间不存在", "data": None}
        
        if room['status'] != 'ready':
            return {"code": 1005, "message": "房间状态错误，所有玩家需准备", "data": None}
        
        if len(room['players']) < 2:
            return {"code": 1001, "message": "玩家数量不足，至少需要2人", "data": None}
        
        # 使用 ELO 平衡算法分队
        teams = balance_teams(room['players'])
        
        # 更新房间信息
        rooms.update_one(
            {"_id": req.room_id},
            {"$set": {
                "teamA": [p['player_id'] for p in teams['teamA']],
                "teamB": [p['player_id'] for p in teams['teamB']],
                "elo_diff": teams['elo_diff'],
                "status": "matching",
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        return {
            "code": 0,
            "message": "匹配成功",
            "data": {
                "teamA": teams['teamA'],
                "teamB": teams['teamB'],
                "elo_diff": teams['elo_diff'],
                "teamA_avg_elo": teams['teamA_avg'],
                "teamB_avg_elo": teams['teamB_avg']
            }
        }
    except Exception as e:
        return {"code": 9999, "message": f"匹配失败：{str(e)}", "data": None}

def balance_teams(players: List[Dict]) -> Dict:
    """ELO 平衡算法 - 使用暴力枚举找到最平衡的分队方案"""
    n = len(players)
    half_size = n // 2
    
    best_diff = float('inf')
    best_team_a = []
    best_team_b = []
    
    # 生成所有可能的组合
    combinations = get_combinations(players, half_size)
    
    for team_a in combinations:
        team_b = [p for p in players if p not in team_a]
        
        if len(team_a) == 0 or len(team_b) == 0:
            continue
        
        elo_a = sum(p['elo'] for p in team_a) / len(team_a)
        elo_b = sum(p['elo'] for p in team_b) / len(team_b)
        diff = abs(elo_a - elo_b)
        
        if diff < best_diff:
            best_diff = diff
            best_team_a = team_a
            best_team_b = team_b
    
    team_a_avg = sum(p['elo'] for p in best_team_a) / len(best_team_a) if best_team_a else 0
    team_b_avg = sum(p['elo'] for p in best_team_b) / len(best_team_b) if best_team_b else 0
    
    return {
        "teamA": best_team_a,
        "teamB": best_team_b,
        "elo_diff": round(best_diff),
        "teamA_avg": round(team_a_avg),
        "teamB_avg": round(team_b_avg)
    }

def get_combinations(arr: List, size: int) -> List[List]:
    """获取所有组合"""
    result = []
    
    def combine(start: int, combo: List):
        if len(combo) == size:
            result.append(combo[:])
            return
        
        for i in range(start, len(arr)):
            combo.append(arr[i])
            combine(i + 1, combo)
            combo.pop()
    
    combine(0, [])
    return result

