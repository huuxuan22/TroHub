"""TroHub chats service — FastAPI + WebSocket (dev / đồ án)."""

from __future__ import annotations

import os
from typing import Annotated

from dotenv import load_dotenv
from fastapi import FastAPI, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect

load_dotenv()

_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
allow_origins = [o.strip() for o in _origins.split(",") if o.strip()]

app = FastAPI(
    title="TroHub Chats API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "chats"}


@app.websocket("/ws")
async def websocket_chat(
    websocket: WebSocket,
    token: Annotated[str | None, Query()] = None,
):
    """WebSocket đơn giản: echo JSON (mở rộng room/chat sau)."""
    await websocket.accept()
    client_token = token or "anonymous"
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json(
                {
                    "from": client_token,
                    "echo": data,
                    "hint": "Thay bằng room_id / persistence khi mở rộng đồ án.",
                }
            )
    except WebSocketDisconnect:
        return
