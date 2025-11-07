"""
历史记录和排行榜路由
"""
from fastapi import APIRouter
from utils.storage import get_collection

router = APIRouter()

@router.get("/player/{player_id}")
async def get_player_history(player_id: str):
    """获取玩家历史战绩"""
    try:
        player_stats_col = get_collection('player_stats')
        matches = get_collection('matches')
        
        # 获取玩家所有比赛统计
        stats = player_stats_col.find({"player_id": player_id})
        stats.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        stats = stats[:20]
        
        # 获取对应的比赛信息
        match_ids = [s['match_id'] for s in stats]
        match_docs = {m['_id']: m for m in matches.find()}
        
        # 组合数据
        history = []
        for stat in stats:
            match = match_docs.get(stat['match_id'])
            history.append({
                **stat,
                "match_date": match.get('date') if match else None,
                "match_map": match.get('map') if match else None,
                "match_winner": match.get('winner') if match else None,
                "score_a": match.get('score_a', 0) if match else 0,
                "score_b": match.get('score_b', 0) if match else 0
            })
        
        return {
            "code": 0,
            "message": "获取成功",
            "data": history
        }
    except Exception as e:
        return {"code": 9999, "message": f"获取失败：{str(e)}", "data": []}

@router.get("/ranking")
async def get_ranking():
    """获取排行榜"""
    try:
        players = get_collection('players')
        
        # 获取前50名玩家
        all_players = players.find()
        all_players.sort(key=lambda x: x.get('elo', 0), reverse=True)
        ranking = all_players[:50]
        
        ranking_data = []
        for index, player in enumerate(ranking):
            total_matches = player.get('total_matches', 0)
            wins = player.get('wins', 0)
            total_kills = player.get('total_kills', 0)
            total_deaths = player.get('total_deaths', 0)
            
            ranking_data.append({
                "rank": index + 1,
                "player_id": player['_id'],
                "nickname": player.get('nickname', ''),
                "elo": player.get('elo', 1000),
                "total_matches": total_matches,
                "wins": wins,
                "losses": player.get('losses', 0),
                "win_rate": round((wins / total_matches) * 100) if total_matches > 0 else 0,
                "kd_ratio": f"{(total_kills / total_deaths):.2f}" if total_deaths > 0 else f"{total_kills:.2f}"
            })
        
        return {
            "code": 0,
            "message": "获取成功",
            "data": ranking_data
        }
    except Exception as e:
        return {"code": 9999, "message": f"获取失败：{str(e)}", "data": []}

@router.get("/player-info/{player_id}")
async def get_player_info(player_id: str):
    """获取玩家信息"""
    try:
        players = get_collection('players')
        player = players.find_by_id(player_id)
        
        if not player:
            return {"code": 1002, "message": "玩家不存在", "data": None}
        
        return {
            "code": 0,
            "message": "获取成功",
            "data": player
        }
    except Exception as e:
        return {"code": 9999, "message": f"获取失败：{str(e)}", "data": None}

