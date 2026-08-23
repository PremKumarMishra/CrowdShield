from fastapi.websockets import WebSocket,WebSocketDisconnect
from typing import Dict,List

#Generic Packet Mutators
def get_mobile_telemetry(telemetry):
    payload = {"type" : 4}
    gate_controls:List = telemetry["recommendations"]["gate_controls"]
    gate_info = list(map(lambda g: {**g["gate"],"role" : g["role"]},gate_controls))
    payload["heat_boxes"] =  telemetry["heat_boxes"]
    payload["risk_status"] =  telemetry["risk_prediction"]["status"]
    payload["announcement"] = telemetry["recommendations"]["multilingual_announcements"]
    payload["gate_info"] = gate_info
    return payload

def get_mobile_vconfig(config):
    payload =  {"type":3}
    payload["dimensions"] = config.get("dimensions",[])
    payload["gates"] = config.get("gates",[])
    return payload


class MobileConnectionManager:
    def __init__(self,incident_service):
        self.connections:Dict[WebSocket,str] = {}
        self.dashboard_manager = None
        self.incident_service = incident_service

    def configure(self,manager):
        self.dashboard_manager = manager

    async def connect(self,ws:WebSocket):
        await ws.accept()
        self.connections[ws] = 'hi-IN'
        print("[WS(Mobile)] Client Connected")

    def disconnect(self,ws:WebSocket):
        if ws in self.connections:
            del self.connections[ws]
        print("[WS(Mobile)] Client Disconnected")

    async def send_venue_config(self,ws:WebSocket,config:dict):
        try:
            await ws.send_json(config)
        except WebSocketDisconnect:
            self.disconnect(ws)

    async def broadcast(self,payload):
        disconnected_clients = []
        for connection,language in self.connections.items():
            try:
                if payload.get("type",-1) == 4:
                    payload["announcement"]["other"] = self.incident_service.language_service.translate(payload["announcement"]["english"],language)
                await connection.send_json(payload)
            except WebSocketDisconnect:
                disconnected_clients.append(connection)

        for client in disconnected_clients:
            self.disconnect(client)

    async def recv_process(self,ws:WebSocket):
        try:
            while True:
                payload = await ws.receive_json()
                #Process Incident Audio And Detect Category
                if payload.get("type",-1) == 2:
                    category = self.incident_service.get_category(payload.get("audio",""))
                    del payload["audio"]
                    payload = {**payload,**category}
                elif payload.get("type",-1) == 6:
                    self.connections[ws] = payload.get("language","hi-IN")
                    continue
                if self.dashboard_manager:
                    await self.dashboard_manager.broadcast(payload)
                
        except WebSocketDisconnect:
            self.disconnect(ws)


    