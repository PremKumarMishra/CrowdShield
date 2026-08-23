from fastapi.websockets import WebSocket,WebSocketDisconnect
from typing import List
class WebConnectionManager:
    def __init__(self):
        self.active_connections:List[WebSocket] = []

    async def connect(self,conn:WebSocket):
        await conn.accept()
        self.active_connections.append(conn)
        print("[WS(Web)] Client Connected")

    def disconnect(self,conn:WebSocket):
        if conn in self.active_connections:
            self.active_connections.remove(conn)
        print("[WS(Web)] Client Disconnected")

    async def broadcast(self,paylod):
        disconnected_clients = []
        for connection in self.active_connections:
            try:
                await connection.send_json(paylod)
            except WebSocketDisconnect:
                disconnected_clients.append(connection)
        for client in disconnected_clients:
            self.disconnect(client)

    async def send(self,ws:WebSocket,payload):
        try:
            await ws.send_json(payload)
        except WebSocketDisconnect:
            self.disconnect(ws)

    async def recv_process(self,ws:WebSocket):
        try:
            while True:
                payload = await ws.receive_json()
        except WebSocketDisconnect:
            self.disconnect(ws)