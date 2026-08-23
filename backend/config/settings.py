from dataclasses import dataclass
from dotenv import load_dotenv
import torch
import os

load_dotenv()

@dataclass
class AppConfig:
    SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY","")

@dataclass
class VisionConfig:
    MODEL:str = "model/best.pt"
    DEVICE:str = 'cuda' if torch.cuda.is_available() else 'cpu'

    ZONE_AREA_SQM:float = 15.0 # Assumption That The Camera Covers 15 m^2
    SAFE_DENSITY_CAP:float = 2.0 #Assumption 2 People Per m^2 Is Safe
    CRITICAL_DENSITY_CAP:float = 4.0 #Assumption 4 People Per m^2 Is Danger
    GATE_RADIUS = 25 #Assumption That Crowd Not Reaching  25m Radius Of Gate Is Safe

    HISTORY_SIZE:int = 30
    PHYSICS_HISTORY_SIZE:int = 15
    STABILIZATION_POINT_THRESHOLD:int = 30

    FLOW_WIDTH:int = 320
    FLOW_HEIGHT:int = 180

    MODEL_CONF:float = 0.10
    MODEL_IOU:float = 0.45
    MODEL_IMGSZ:int = 1024
    
