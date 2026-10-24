import cv2
import queue
import time
import asyncio

class CameraStream:
    def __init__(self,source,loop):
        self.source = source
        self.loop = loop
        self.frame_queue = queue.Queue(maxsize=1)
        self.new_frame_event = asyncio.Event()
        self.latest_jpeg_frame = None

    def start(self):
        cap = cv2.VideoCapture(self.source,cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_HW_ACCELERATION,cv2.VIDEO_ACCELERATION_ANY)
        if not cap.isOpened():
            print(f"Cannot open video stream source: {self.source}")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_delay = 1/fps
        print(f"Simulated Camera Feed Active @{fps:.1f} FPS.")

        while True:
            loop_start = time.perf_counter()
            ret,frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES,0)
                continue

            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                except queue.Empty:
                    pass
            self.frame_queue.put_nowait(frame)
            
            stream_frame = cv2.resize(frame, (640, 360))
            success,jpeg_frame = cv2.imencode(".jpg",stream_frame,[int(cv2.IMWRITE_JPEG_QUALITY),75])
            if success:
                self.latest_jpeg_frame = jpeg_frame.tobytes()
                self.loop.call_soon_threadsafe(self.new_frame_event.set)
    
            elpased = time.perf_counter() - loop_start
            sleep_duration = frame_delay - elpased
            if sleep_duration > 0:
                time.sleep(sleep_duration)

    async def generate_mjpeg_stream(self):
        while True:
            await self.new_frame_event.wait()
            self.new_frame_event.clear()
            if self.latest_jpeg_frame:
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + self.latest_jpeg_frame + b'\r\n'
                )