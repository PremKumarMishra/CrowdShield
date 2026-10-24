from dataclasses import dataclass
import cv2
import numpy as np

@dataclass
class MotionResult:
    speed: float
    variance: float
    direction: str
    reverse_flow: bool

class MotionAnalyzer:
    def __init__(self,vconfig):
        self.vconfig = vconfig
        self.prev_gray_frame = None

    def analyze(self,gray_frame,person_count,projector):
        if self.prev_gray_frame is not None:
            is_reverse_flow = False
            flow = cv2.calcOpticalFlowFarneback(self.prev_gray_frame, gray_frame, None, pyr_scale=0.5, levels=2, winsize=9, iterations=2, poly_n=5, poly_sigma=1.1, flags=0)
            mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])

            motion_mask = mag > 1.0
            if not np.any(motion_mask):
                return MotionResult(0,0,"STATIONARY",is_reverse_flow)
            
            flow_x = flow[...,0][motion_mask]
            flow_y = flow[...,1][motion_mask]
            mean_dx = np.mean(flow_x)
            mean_dy = np.mean(flow_y)

            angle = np.degrees(np.arctan2(mean_dy, mean_dx))
            angle = (angle + 360) % 360

            mean_vector_mag = np.sqrt(mean_dx ** 2 + mean_dy ** 2)
            mean_flow_mag = np.mean(np.sqrt(flow_x ** 2 + flow_y ** 2)) 
            direction_confidence = mean_vector_mag / mean_flow_mag
            
            motion_speed = float(np.mean(mag[motion_mask]))
            motion_variance = float(np.var(mag[motion_mask]))

            # Flow Direction Vector Analysis
            if projector.h_matrix is not None:
                venue_flow = projector.calculate_venue_flow(mean_dx,mean_dy)
                if np.any(venue_flow):
                    direction = self.vconfig.get("camera",{}).get("direction","FORWARD")
                    is_reverse_flow = projector.classify_venue_flow(venue_flow,direction)
                    if person_count < 10:
                        is_reverse_flow = False 

            if direction_confidence < 0.3:
                primary_direction = "MIXED"
                is_reverse_flow = False
            elif 45 <= angle < 135:
                primary_direction = f"SOUTH ({int(direction_confidence*100)}%)"
            elif 135 <= angle < 225:
                primary_direction = f"WEST ({int(direction_confidence*100)}%)"
            elif 225 <= angle < 315:
                primary_direction = f"NORTH ({int(direction_confidence*100)}%)"
            else:
                primary_direction = f"EAST ({int(direction_confidence*100)}%)"

            return MotionResult(motion_speed,motion_variance,primary_direction,is_reverse_flow)

        self.prev_gray_frame = gray_frame
        return MotionResult(0,0,"STATIONARY",False)
        