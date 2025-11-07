"""
CS2 内战匹配系统 - FastAPI 后端
使用 JSON 文件存储数据，无需数据库
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
from pathlib import Path

from routers import auth, room, match, bp, submit, history
from utils.storage import init_storage

# 创建 FastAPI 应用
app = FastAPI(
    title="CS2 Match System",
    description="CS2 内战匹配系统 API",
    version="2.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化数据存储
init_storage()

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(room.router, prefix="/api/room", tags=["房间"])
app.include_router(match.router, prefix="/api/match", tags=["匹配"])
app.include_router(bp.router, prefix="/api/bp", tags=["BP"])
app.include_router(submit.router, prefix="/api/submit", tags=["提交"])
app.include_router(history.router, prefix="/api/history", tags=["历史"])

# 健康检查
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "message": "CS2 匹配系统运行中",
        "version": "2.0.0 (FastAPI)"
    }

# 静态文件服务
frontend_path = Path(__file__).parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """服务前端静态文件"""
        if not full_path or full_path == "/":
            full_path = "index.html"
        
        file_path = frontend_path / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # 如果文件不存在，返回 index.html (SPA 路由)
        index_path = frontend_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    print("=" * 50)
    print("  CS2 Match System - Starting Server")
    print("=" * 50)
    print()
    print(f"  Server: http://localhost:3000")
    print(f"  API Docs: http://localhost:3000/docs")
    print(f"  Stop: Press Ctrl+C")
    print()
    print("=" * 50)
    print()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=False,
        log_level="info"
    )

