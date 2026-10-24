from ultralytics.models import YOLO

class PersonDetector:
    def __init__(self,model_path,config):
        self.model = YOLO(model_path)
        self.config = config

    def detect(self,frame):
        result = self.model.predict(frame,iou=self.config.MODEL_IOU,conf=self.config.MODEL_CONF,imgsz=self.config.MODEL_IMGSZ,verbose=False)
        return result[0].boxes
