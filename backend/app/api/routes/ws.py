from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter()

# Connection manager for WebSockets
class ConnectionManager:
    def __init__(self):
        # Maps case_id to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, case_id: str):
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = []
        self.active_connections[case_id].append(websocket)

    def disconnect(self, websocket: WebSocket, case_id: str):
        if case_id in self.active_connections:
            self.active_connections[case_id].remove(websocket)
            if not self.active_connections[case_id]:
                del self.active_connections[case_id]

    async def broadcast_to_case(self, case_id: str, message: dict):
        if case_id in self.active_connections:
            for connection in self.active_connections[case_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

@router.websocket("/{case_id}")
async def websocket_endpoint(websocket: WebSocket, case_id: str):
    """
    WebSocket endpoint for real-time Co-Pilot chat and task status updates.
    """
    await manager.connect(websocket, case_id)
    try:
        while True:
            # Receive messages from the frontend (e.g., Co-Pilot questions)
            data = await websocket.receive_text()
            
            # TM3 will handle the actual LLM logic, we just echo for now
            response = {
                "type": "copilot_response",
                "message": f"Received your query for case {case_id}: {data}",
                "status": "echo"
            }
            await manager.broadcast_to_case(case_id, response)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, case_id)
