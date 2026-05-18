import json
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.database import SessionLocal
from app.models import Message
from app.services.auth_service import decode_access_token
from app.services.chat_realtime import connection_manager

router = APIRouter(tags=["chat"])


@router.websocket("/trohub/ws/chat/{room_id}")
async def chat_websocket(websocket: WebSocket, room_id: str):
    sender_id_raw = websocket.query_params.get("sender_id")
    token = websocket.query_params.get("token")
    if not sender_id_raw or not sender_id_raw.isdigit():
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="sender_id is required")
        return
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="token is required")
        return

    sender_id = int(sender_id_raw)
    try:
        payload = decode_access_token(token)
        token_user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid token")
        return

    if token_user_id != sender_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="sender_id does not match token")
        return

    await connection_manager.connect(room_id=room_id, websocket=websocket)

    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                payload = json.loads(raw_message)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON payload"})
                continue

            receiver_id = payload.get("receiver_id")
            content = payload.get("content")

            if not isinstance(receiver_id, int) or not isinstance(content, str) or not content.strip():
                await websocket.send_json({"type": "error", "message": "receiver_id(int) and content(non-empty string) are required"})
                continue

            db_room_id = int(room_id) if room_id.isdigit() and int(room_id) > 0 else None
            db = SessionLocal()
            try:
                db_message = Message(
                    sender_id=sender_id,
                    receiver_id=receiver_id,
                    room_id=db_room_id,
                    content=content.strip(),
                    is_read=False,
                )
                db.add(db_message)
                try:
                    db.commit()
                    db.refresh(db_message)
                except Exception:
                    db.rollback()
                    await websocket.send_json({"type": "error", "message": "Could not save message"})
                    continue
            finally:
                db.close()

            await connection_manager.broadcast(
                room_id=room_id,
                message={
                    "type": "message",
                    "id": db_message.id,
                    "room_id": db_room_id,
                    "sender_id": sender_id,
                    "receiver_id": receiver_id,
                    "content": db_message.content,
                    "sent_at": db_message.sent_at.isoformat() if isinstance(db_message.sent_at, datetime) else None,
                },
            )
    except WebSocketDisconnect:
        connection_manager.disconnect(room_id=room_id, websocket=websocket)
