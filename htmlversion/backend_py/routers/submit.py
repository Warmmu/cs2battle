"""
比赛结果提交路由
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
from utils.storage import get_collection

router = APIRouter()

class PlayerStat(BaseModel):
    player_id: str
    kills: int
    deaths: int
    assists: int = 0

class UpdateMatchRequest(BaseModel):
    match_id: str
    score_a: int = 0
    score_b: int = 0
    player_stats: List[Dict] = []

class FinishMatchRequest(BaseModel):
    match_id: str
    score_a: int
    score_b: int
    player_stats: List[Dict]

@router.post("/update")
async def update_match(req: UpdateMatchRequest):
    """更新比赛数据（实时保存）"""
    try:
        matches = get_collection('matches')
        
        matches.update_one(
            {"_id": req.match_id},
            {"$set": {
                "score_a": req.score_a,
                "score_b": req.score_b,
                "player_stats": req.player_stats,
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        return {
            "code": 0,
            "message": "数据已保存",
            "data": None
        }
    except Exception as e:
        return {"code": 9999, "message": f"更新失败：{str(e)}", "data": None}

@router.post("/finish")
async def finish_match(req: FinishMatchRequest):
    """提交比赛结果（完成比赛）"""
    try:
        # 验证数据
        if req.score_a == 0 and req.score_b == 0:
            return {"code": 1001, "message": "请输入比分", "data": None}
        
        incomplete = any(not p.get('kills') and not p.get('deaths') for p in req.player_stats)
        if incomplete:
            return {"code": 1001, "message": "请填写所有玩家数据", "data": None}
        
        matches = get_collection('matches')
        players = get_collection('players')
        player_stats_col = get_collection('player_stats')
        elo_history = get_collection('elo_history')
        
        # 获取比赛信息
        match = matches.find_by_id(req.match_id)
        if not match:
            return {"code": 1003, "message": "比赛不存在", "data": None}
        
        # 判断胜者
        winner = 'A' if req.score_a > req.score_b else ('B' if req.score_b > req.score_a else 'draw')
        
        # 计算 ELO 变化
        elo_changes = await calculate_elo(match, req.score_a, req.score_b, req.player_stats, winner)
        
        # 更新比赛状态
        matches.update_one(
            {"_id": req.match_id},
            {"$set": {
                "score_a": req.score_a,
                "score_b": req.score_b,
                "winner": winner,
                "status": "finished",
                "finished_at": datetime.now().isoformat(),
                "player_stats": req.player_stats
            }}
        )
        
        # 保存玩家统计数据
        for stat in req.player_stats:
            elo_change = next((e for e in elo_changes if e['player_id'] == stat['player_id']), None)
            
            player_stats_col.insert_one({
                "match_id": req.match_id,
                "player_id": stat['player_id'],
                "team": 'A' if stat['player_id'] in match['teamA'] else 'B',
                "kills": stat['kills'],
                "deaths": stat['deaths'],
                "assists": stat.get('assists', 0),
                "kd_ratio": stat['kills'] / stat['deaths'] if stat['deaths'] > 0 else stat['kills'],
                "elo_before": elo_change['old_elo'] if elo_change else 0,
                "elo_after": elo_change['new_elo'] if elo_change else 0,
                "elo_change": elo_change['elo_change'] if elo_change else 0,
                "created_at": datetime.now().isoformat()
            })
        
        # 更新玩家 ELO 和统计
        for change in elo_changes:
            stat = next((s for s in req.player_stats if s['player_id'] == change['player_id']), None)
            is_winner = (
                (winner == 'A' and change['player_id'] in match['teamA']) or
                (winner == 'B' and change['player_id'] in match['teamB'])
            )
            
            players.update_one(
                {"_id": change['player_id']},
                {
                    "$set": {
                        "elo": change['new_elo'],
                        "updated_at": datetime.now().isoformat()
                    },
                    "$inc": {
                        "total_matches": 1,
                        "wins": 1 if is_winner and winner != 'draw' else 0,
                        "losses": 1 if not is_winner and winner != 'draw' else 0,
                        "total_kills": stat['kills'] if stat else 0,
                        "total_deaths": stat['deaths'] if stat else 0
                    }
                }
            )
            
            # 记录 ELO 历史
            elo_history.insert_one({
                "player_id": change['player_id'],
                "match_id": req.match_id,
                "elo_before": change['old_elo'],
                "elo_after": change['new_elo'],
                "elo_change": change['elo_change'],
                "reason": 'win' if is_winner else ('draw' if winner == 'draw' else 'loss'),
                "created_at": datetime.now().isoformat()
            })
        
        # 更新房间状态
        rooms = get_collection('rooms')
        rooms.update_one(
            {"_id": match['room_id']},
            {"$set": {
                "status": "finished",
                "updated_at": datetime.now().isoformat()
            }}
        )
        
        return {
            "code": 0,
            "message": "提交成功",
            "data": {"elo_changes": elo_changes}
        }
    except Exception as e:
        return {"code": 9999, "message": f"提交失败：{str(e)}", "data": None}

@router.get("/{room_id}")
async def get_match(room_id: str):
    """获取比赛信息"""
    try:
        matches = get_collection('matches')
        all_matches = matches.find({"room_id": room_id, "status": "playing"})
        
        if not all_matches:
            return {"code": 1003, "message": "比赛不存在", "data": None}
        
        match = all_matches[0] if all_matches else None
        if not match:
            return {"code": 1003, "message": "比赛不存在", "data": None}
        
        return {
            "code": 0,
            "message": "获取成功",
            "data": match
        }
    except Exception as e:
        return {"code": 9999, "message": f"获取失败：{str(e)}", "data": None}

async def calculate_elo(match: Dict, score_a: int, score_b: int, player_stats: List[Dict], winner: str) -> List[Dict]:
    """计算 ELO 变化"""
    players = get_collection('players')
    changes = []
    
    # 获取所有玩家信息
    all_player_ids = match['teamA'] + match['teamB']
    player_docs = {p['_id']: p for p in players.find()}
    
    # 计算队伍平均 ELO
    team_a_players = [player_docs[pid] for pid in match['teamA'] if pid in player_docs]
    team_b_players = [player_docs[pid] for pid in match['teamB'] if pid in player_docs]
    
    avg_elo_a = sum(p['elo'] for p in team_a_players) / len(team_a_players) if team_a_players else 1000
    avg_elo_b = sum(p['elo'] for p in team_b_players) / len(team_b_players) if team_b_players else 1000
    
    # 计算期望胜率
    expected_a = 1 / (1 + pow(10, (avg_elo_b - avg_elo_a) / 400))
    expected_b = 1 - expected_a
    
    # 实际得分
    actual_a = 1 if winner == 'A' else (0.5 if winner == 'draw' else 0)
    actual_b = 1 - actual_a
    
    # 计算每个玩家的 ELO 变化
    for player_id in all_player_ids:
        if player_id not in player_docs:
            continue
        
        player_doc = player_docs[player_id]
        stat = next((s for s in player_stats if s['player_id'] == player_id), None)
        is_team_a = player_id in match['teamA']
        
        # K 因子
        K = 32
        if player_doc['elo'] < 1200:
            K = 40
        elif player_doc['elo'] > 1800:
            K = 24
        
        # 基础 ELO 变化
        expected = expected_a if is_team_a else expected_b
        actual = actual_a if is_team_a else actual_b
        elo_change = K * (actual - expected)
        
        # KD 修正
        if stat:
            kd = stat['kills'] / stat['deaths'] if stat['deaths'] > 0 else stat['kills']
            if kd > 1.5:
                elo_change *= 1.2
            elif kd < 0.8:
                elo_change *= 0.8
        
        elo_change = round(elo_change)
        new_elo = max(0, player_doc['elo'] + elo_change)
        
        changes.append({
            "player_id": player_id,
            "nickname": player_doc['nickname'],
            "old_elo": player_doc['elo'],
            "new_elo": new_elo,
            "elo_change": elo_change
        })
    
    return changes

