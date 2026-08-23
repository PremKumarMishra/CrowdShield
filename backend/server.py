from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket
from fastapi.responses import StreamingResponse,Response
from config.settings import VisionConfig,AppConfig
from pipeline.vision_pipeline import VisionPipeline
from camera.stream import CameraStream
from schema.model import VenueConfig
from network.mobile import MobileConnectionManager,get_mobile_telemetry,get_mobile_vconfig
from network.web import WebConnectionManager
from services.language import LanguageService
from services.incident import IncidentService
from contextlib import asynccontextmanager
import uvicorn
import threading
import asyncio
import time

def process_vision(vision_engine,camera_stream,loop):
    global latest_telemetry
    TELEMETRY_EMIT_INTERVAL = 0.25
    last_telemetry_emit = 0.0

    while True:
        frame = camera_stream.frame_queue.get()
        current_timestamp = round(time.time(), 2)
        telemetry = vision_engine.process(frame,current_timestamp)
        latest_telemetry = telemetry
        camera_stream.frame_queue.task_done()

        now = time.time()
        if (now - last_telemetry_emit >= TELEMETRY_EMIT_INTERVAL):
            if manager.active_connections:
                asyncio.run_coroutine_threadsafe(manager.broadcast({**latest_telemetry,"type":5}),loop)
            if mobile_manager.connections:
                mobile_telemetry = get_mobile_telemetry(latest_telemetry)
                asyncio.run_coroutine_threadsafe(mobile_manager.broadcast(mobile_telemetry),loop)

            last_telemetry_emit = now


@asynccontextmanager
async def lifespan(app):
    global camera_stream,vision_engine
    event_loop = asyncio.get_running_loop()

    camera_stream = CameraStream("videos/s10.mp4",event_loop)
    vision_config = VisionConfig()
    vision_engine = VisionPipeline(vision_config)

    # Camera Stream Thread
    stream_thread = threading.Thread(target=camera_stream.start,daemon=True)
    stream_thread.start()
    print("Camera Steam Thread Started.")

    # Vision Thread
    vision_thread = threading.Thread(target=process_vision,args=(vision_engine,camera_stream,event_loop),daemon=True)
    vision_thread.start()
    print("Vision Thread Started.")
    yield


app_config = AppConfig()
app = FastAPI(title="CrowdShield",version="1.0",lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
    allow_credentials=True
)

#Camera Stream And Vision Engine
camera_stream = None
vision_engine = None
latest_telemetry = None

#Services
language_service = LanguageService(app_config)
incident_service = IncidentService(language_service)

#Network Managers
manager = WebConnectionManager()
mobile_manager = MobileConnectionManager(incident_service)
mobile_manager.configure(manager)

@app.get("/api/v1/stream/cam1")
def get_camera_stream():
    return StreamingResponse(camera_stream.generate_mjpeg_stream(),media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/v1/stream/cam1/frame")
async def get_current_camera_frame():
    await camera_stream.new_frame_event.wait()
    camera_stream.new_frame_event.clear()
    if camera_stream.latest_jpeg_frame:
        return Response(content=camera_stream.latest_jpeg_frame,media_type="image/jpeg")

@app.post("/api/v1/venue/config")
async def update_venue_config(venue:VenueConfig):
    vision_engine.set_venue_config(venue.model_dump(mode="json"))
    payload = get_mobile_vconfig(vision_engine.vconfig.copy())
    await mobile_manager.broadcast(payload)

@app.get("/api/v1/telemetry/current")
def get_current_telemetry():
    return latest_telemetry

@app.websocket("/ws/web")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    if latest_telemetry:
        await manager.send(websocket,{**latest_telemetry,"type":5})  
    await manager.recv_process(websocket)

@app.websocket("/ws/mobile")
async def websocket_mobile(websocket:WebSocket):
    payload = get_mobile_vconfig(vision_engine.vconfig.copy())
    await mobile_manager.connect(websocket)
    await mobile_manager.send_venue_config(websocket,payload)
    await mobile_manager.recv_process(websocket)


if __name__ == "__main__":
    uvicorn.run("server:app",host="0.0.0.0",port=8000)