"""
认证路由 - 登录和注册
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from utils.storage import get_collection

router = APIRouter()

class RegisterRequest(BaseModel):
    nickname: str
    steam_id: Optional[str] = None
    avatar: Optional[str] = None

class LoginRequest(BaseModel):
    nickname: str

@router.post("/register")
async def register(req: RegisterRequest):
    """玩家注册"""
    try:
        nickname = req.nickname.strip()
        
        if not nickname:
            return {"code": 1001, "message": "昵称不能为空", "data": None}
        
        players = get_collection('players')
        
        # 检查昵称是否已存在
        existing = players.find_one({"nickname": nickname})
        if existing:
            return {"code": 1001, "message": "昵称已存在", "data": None}
        
        # 创建新玩家
        new_player = {
            "nickname": nickname,
            "steam_id": req.steam_id,
            "avatar": req.avatar,
            "elo": 1000,
            "total_matches": 0,
            "wins": 0,
            "losses": 0,
            "total_kills": 0,
            "total_deaths": 0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        player_id = players.insert_one(new_player)
        
        return {
            "code": 0,
            "message": "注册成功",
            "data": {
                "player_id": player_id,
                "nickname": nickname,
                "elo": 1000
            }
        }
    except Exception as e:
        return {"code": 9999, "message": f"注册失败：{str(e)}", "data": None}

@router.post("/login")
async def login(req: LoginRequest):
    """玩家登录"""
    try:
        nickname = req.nickname.strip()
        
        if not nickname:
            return {"code": 1001, "message": "昵称不能为空", "data": None}
        
        players = get_collection('players')
        
        # 查找玩家
        player = players.find_one({"nickname": nickname})
        
        if not player:
            return {"code": 1001, "message": "该昵称未注册，请先注册", "data": None}
        
        return {
            "code": 0,
            "message": "登录成功",
            "data": {
                "player_id": player['_id'],
                "nickname": player['nickname'],
                "elo": player['elo'],
                "total_matches": player['total_matches'],
                "wins": player['wins'],
                "losses": player['losses']
            }
        }
    except Exception as e:
        return {"code": 9999, "message": f"登录失败：{str(e)}", "data": None}

