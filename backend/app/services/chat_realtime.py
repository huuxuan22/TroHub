from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, room_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: int, websocket: WebSocket) -> None:
        if room_id not in self.active_connections:
            return
        if websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)
        if not self.active_connections[room_id]:
            del self.active_connections[room_id]

    async def broadcast(self, room_id: int, message: dict) -> None:
        for connection in self.active_connections.get(room_id, []):
            await connection.send_json(message)


connection_manager = ConnectionManager()
