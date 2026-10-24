# {
#     "id": "cam_0",
#     "name": "CAM-01",
# }
from asyncio.events import AbstractEventLoop
import asyncio
import threading
import cv2
import time
import queue
from .engine import VisionEngine


class CameraWorker:
    def __init__(self,cam_id:str,cam_src:str,loop:AbstractEventLoop,model,engine_config,is_active=False):
        self.cam_id = cam_id
        self.cam_src = cam_src
        self.loop = loop
        self.is_active = is_active
        self.lock = threading.Lock()
        self.condition = asyncio.Condition()
        self.running = False
        self.latest_jpeg_frame: bytes = b""
        self.latest_telemetry: dict = {}
        self.ai_queue = queue.Queue(maxsize=1)
        self.cap_thread = None
        self.ai_thread = None
        self.vision_engine = VisionEngine(model, engine_config)

    def set_config(self,config):
        self.cam_config = config
        self.vision_engine.venue_config = self.cam_config

    def set_active(self,state):
        self.is_active = state

    def start(self):
        self.running = True
        self.cap_thread = threading.Thread(target=self.__capture_frames,daemon=True)
        self.cap_thread.start()
        self.ai_thread = threading.Thread(target=self.__process_frames,daemon=True)
        self.ai_thread.start()

    def stop(self):
        self.running = False

    def __capture_frames(self):
        cap = cv2.VideoCapture(self.cam_src,cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_HW_ACCELERATION,cv2.VIDEO_ACCELERATION_ANY)

        if not cap.isOpened():
            print(f"{self.cam_id} failed to open stream {self.cam_src}")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_delay = 1/fps
        print(f"{self.cam_id} is running at {fps} FPS")

        while self.running:
            loop_start = time.perf_counter()
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            if self.ai_queue.full():
                try:
                    self.ai_queue.get_nowait()
                except queue.Empty:
                    pass
            self.ai_queue.put_nowait(frame)

            stream_frame = cv2.resize(frame, (640, 360))
            success, jpeg_frame = cv2.imencode(".jpg", stream_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if success:
                jpeg_bytes = jpeg_frame.tobytes()
                with self.lock:
                    self.latest_jpeg_frame = jpeg_bytes
                self.loop.call_soon_threadsafe(self.__notify_new_frame)
            elapsed = time.perf_counter() - loop_start
            sleep_duration = frame_delay - elapsed
            # print(elapsed,sleep_duration)
            if sleep_duration > 0:
                time.sleep(sleep_duration)
        cap.release()

    def __process_frames(self):
        while self.running:
            if not self.is_active:
                time.sleep(0.1)
                continue

            try:
                frame = self.ai_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            current_timestamp = round(time.time(), 2)
            _, telemetry = self.vision_engine.process_frame(frame, current_timestamp)
            
            telemetry["cam_id"] = self.cam_id
            with self.lock:
                self.latest_telemetry = telemetry
            self.ai_queue.task_done()

    def __notify_new_frame(self):
        asyncio.create_task(self.__notify())

    async def __notify(self):
        async with self.condition:
            self.condition.notify_all()

    async def generate_mjpeg_stream(self):
        while self.running:
            async with self.condition:
                await self.condition.wait()
                with self.lock:
                    frame_data = self.latest_jpeg_frame
            if frame_data:
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n'
                )