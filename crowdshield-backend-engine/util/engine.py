from ultralytics import YOLO
from collections import deque
from dataclasses import dataclass
import numpy as np
import torch
import cv2


@dataclass
class EngineConfig:
    DEVICE:str = 'cuda' if torch.cuda.is_available() else 'cpu'

    ZONE_AREA_SQM:float = 15.0 # Assumption That The Camera Covers 15 m^2
    SAFE_DENSITY_CAP:float = 2.0 #Assumption 2 People Per m^2 Is Safe
    CRITICAL_DENSITY_CAP:float = 4.0 #Assumption 4 People Per m^2 Is Danger

    HISTORY_SIZE:int = 30
    PHYSICS_HISTORY_SIZE:int = 15
    STABILIZATION_POINT_THRESHOLD:int = 30

    FLOW_WIDTH:int = 320
    FLOW_HEIGHT:int = 180


class VenueProjectionEngine:
    EXPECTED_DIRECTIONS = {
        "FORWARD" : np.array([0,-1],dtype=np.float32),
        "BACKWARD" : np.array([0,1],dtype=np.float32),
        "LEFT" : np.array([-1,0],dtype=np.float32),
        "RIGHT" : np.array([1,0],dtype=np.float32)
    }

    def __init__(self,venue_width,venue_height,cell_size=2.0):
        self.cell_size = cell_size
        self.venue_width = venue_width
        self.venue_height = venue_height
        self.rows = int(self.venue_height / cell_size)
        self.cols = int(self.venue_width / cell_size)
        self.grid = np.zeros((self.rows,self.cols),dtype=np.float32)
        self.h_matrix = None

    def calculate_homography(self,camera):
        if self.h_matrix is not None:
            return
        
        callibration = camera.get("callibration")
        if not callibration:
            return

        camera_points = np.array(callibration.get("camera_points",[]),dtype=np.float32)
        venue_points = np.array(callibration.get("venue_points",[]),dtype=np.float32)

        if len(camera_points) != 4 or len(venue_points) != 4:
            return

        self.h_matrix,_ = cv2.findHomography(camera_points,venue_points)

    def project_to_venue(self,box,frame_width,frame_height):
        x_min,y_min,x_max,y_max = box

        center_x = (x_min + x_max) / 2
        center_y = (y_min+y_max) / 2

        norm_x = center_x / frame_width
        norm_y = center_y / frame_height

        point = np.array([[[norm_x,norm_y]]],dtype=np.float32)
        projection = cv2.perspectiveTransform(point,self.h_matrix)

        x = float(projection[0][0][0])
        y = float(projection[0][0][1])
        return x, y

    def project_flow_to_venue(self,point):
        point = np.array([[point]],dtype=np.float32)
        projection = cv2.perspectiveTransform(point,self.h_matrix)
        return projection[0][0]

    def calculate_venue_flow(self,mean_dx,mean_dy):
        if self.h_matrix is None:
            return None
        
        flow = np.array([mean_dx,mean_dy],dtype=np.float32)
        flow_magnitude = np.linalg.norm(flow)
        if flow_magnitude < 1e-6:
            return None
        flow_normalized = flow / flow_magnitude
        p1 = np.array([0.5,0.5],dtype=np.float32)
        p2 = p1 + flow_normalized
        v1 = self.project_flow_to_venue(p1)
        v2 = self.project_flow_to_venue(p2)
        venue_flow = v2 -v1
        venue_flow_magnitude = np.linalg.norm(venue_flow)
        if venue_flow_magnitude< 1e-6:
            return None
        venue_flow_normalized = venue_flow/ venue_flow_magnitude
        return venue_flow_normalized

    def classify_venue_flow(self,norm_venue_flow,expected_direction):
        direction = self.EXPECTED_DIRECTIONS.get(expected_direction)
        if norm_venue_flow is None or direction is None:
            return False
        alignment = float(np.dot(norm_venue_flow,direction))
        if alignment < -0.7:
            return True

        return False


    def process_frame(self,boxes,frame_width,frame_height):
        self.grid.fill(0) 
        for box in boxes:
            x, y = self.project_to_venue(box.xyxy[0].cpu().numpy().tolist(),frame_width,frame_height)
            col = int(x / self.cell_size)
            row = int(y / self.cell_size)
            if (col >= 0 and col < self.cols) and (row >= 0 and row < self.rows):
                #0.25 = ConstanT Density Increase Per Person (Assumption)
                self.grid[row, col] = min(1.0, self.grid[row, col] + 0.25)
        return self.get_heatpoints()

    def get_heatpoints(self):
        heat_points = []
        for r in range(self.rows):
            for c in range(self.cols):
                if self.grid[r, c] > 0.05:
                    heat_data = {"x" : (c * self.cell_size) + (self.cell_size / 2),"y" : (r * self.cell_size) + (self.cell_size / 2),"density" : float(self.grid[r, c])}
                    heat_points.append(heat_data)
        return heat_points



class VisionEngine:
    def __init__(self,model,config:EngineConfig):
        self.__model = model
        self.config = config
        self.__venue_config = dict()
        self.venue_projector:VenueProjectionEngine = None

        #Physical Limits
        self.N_SAFE:float = self.config.ZONE_AREA_SQM * self.config.SAFE_DENSITY_CAP
        self.N_MAX = self.config.ZONE_AREA_SQM * self.config.CRITICAL_DENSITY_CAP

        #Max Velocity And Variance
        self.V_MAX = np.sqrt(config.FLOW_WIDTH**2 + config.FLOW_HEIGHT**2)
        self.VAR_MAX = (self.V_MAX ** 2) / 4.0

        #Status Tracking
        self.tracked_pts = None
        self.prev_gray_small = None
        self.history_buffer = deque(maxlen=self.config.HISTORY_SIZE)
        self.variance_buffer = deque(maxlen=self.config.PHYSICS_HISTORY_SIZE)
        self.speed_buffer = deque(maxlen=self.config.PHYSICS_HISTORY_SIZE)

    @property
    def venue_config(self):
        return self.__venue_config

    @venue_config.setter
    def venue_config(self,value):
        self.__venue_config = value
        dimensions = self.__venue_config.get("dimensions")
        self.venue_projector = VenueProjectionEngine(dimensions[0],dimensions[1])        

    def process_frame(self,frame:np.ndarray,timestamp:float):
        gray = cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
        gray_small = cv2.resize(gray,(self.config.FLOW_WIDTH,self.config.FLOW_HEIGHT))
        frame,gray_small = self.__stabilize_video(frame,gray_small)

        results = self.__model.predict(frame,conf=0.10, iou=0.45,imgsz=1024 ,verbose=False, classes=[0], device=self.config.DEVICE)
        boxes = results[0].boxes 
        person_count = len(boxes) #count heads

        #Crowd Detection Boxes
        heat_boxes = []
        if self.venue_projector:
            frame_height,frame_width = frame.shape[:2]
            self.venue_projector.calculate_homography(self.__venue_config.get("camera"))
            heat_boxes = self.venue_projector.process_frame(boxes,frame_width,frame_height)

        #Crowd Motion And Direction
        motion_speed = 0.0
        motion_variance = 0.0
        primary_direction = "STATIONARY"
        is_reverse_flow = False

        crowd_motion = self.__calculate_crowd_motion(gray_small,person_count)
        if crowd_motion:
            motion_speed,motion_variance,primary_direction,is_reverse_flow = crowd_motion
        self.prev_gray_small = gray_small

        risk_score,risk_level = self.__get_risk_info(person_count,motion_speed,motion_variance,is_reverse_flow)
        net_flow_rate,predicted_crush_min = self.__calculate_time_to_crush(timestamp,person_count)

        anomalies = self.__detect_anomalies(person_count,motion_speed,motion_variance,net_flow_rate,is_reverse_flow)
        gate_actions,staff_count,announcements = self.__get_actionable_recommendations(risk_level,heat_boxes)

        telemetry = {
            "timestamp": timestamp,
            "heat_boxes" : heat_boxes,
            "crowd_monitoring": {
                "person_count": person_count,
                "motion_speed": round(motion_speed, 2),
                "motion_variance": round(motion_variance, 2),
                "flow_direction": primary_direction,
                "net_flow_rate": round(net_flow_rate,2)
            },
            "risk_prediction": {
                "risk_score": risk_score,
                "status": risk_level,
                "crush_mins": predicted_crush_min
            },
            "anomalies" : anomalies,
            "recommendations": {
                "gate_controls": gate_actions,
                "security_staff": staff_count,
                "safest_evacuation_route": "Route_East_Exit_2",
                "multilingual_announcements": announcements
            }
        }
        # cv2.imwrite("frames/" + str(timestamp)+".jpg",results[0].plot(labels=False,probs=False),[int(cv2.IMWRITE_JPEG_QUALITY),75])
        return frame,telemetry


    def __stabilize_video(self,proc_frame,gray_small):
        if self.prev_gray_small is not None:
            #Stablize The Video When Stablization Point Is Above ThresHold Value
            if self.tracked_pts is None or len(self.tracked_pts) < self.config.STABILIZATION_POINT_THRESHOLD:
                self.tracked_pts = cv2.goodFeaturesToTrack(self.prev_gray_small, maxCorners=150, qualityLevel=0.01, minDistance=15)
    
            if self.tracked_pts is not None and len(self.tracked_pts) > 0:
                next_pts, status, _ = cv2.calcOpticalFlowPyrLK(self.prev_gray_small, gray_small, self.tracked_pts, None)
                valid_idx = np.where(status == 1)[0]
                
                if len(valid_idx) > 10:
                    transform_matrix, _ = cv2.estimateAffinePartial2D(next_pts[valid_idx], self.tracked_pts[valid_idx], method=cv2.RANSAC)
                    
                    if transform_matrix is not None:
                        h_proc, w_proc = proc_frame.shape[:2]
                        transform_matrix[0, 2] *= (w_proc / self.config.FLOW_WIDTH)
                        transform_matrix[1, 2] *= (h_proc / self.config.FLOW_HEIGHT)

                        proc_frame = cv2.warpAffine(proc_frame, transform_matrix, (w_proc, h_proc))
                        gray_small = cv2.resize(cv2.cvtColor(proc_frame, cv2.COLOR_BGR2GRAY), (self.config.FLOW_WIDTH, self.config.FLOW_HEIGHT))

                    #Update Tracked Points For Next Frame
                    self.tracked_pts = next_pts[valid_idx].reshape(-1, 1, 2)
                else:
                    #If Points Are Lost Force Redetect On Next Frame
                    self.tracked_pts = None

        return proc_frame,gray_small
        

    def __calculate_crowd_motion(self,gray_small,person_count):
        if self.prev_gray_small is not None:
            is_reverse_flow = False

            flow = cv2.calcOpticalFlowFarneback(
                self.prev_gray_small, gray_small, None, 
                pyr_scale=0.5, levels=2, winsize=9, 
                iterations=2, poly_n=5, poly_sigma=1.1, flags=0
            )

            mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            motion_mask = mag > 1.0

            if not np.any(motion_mask):
                return 0,0,"STATIONARY",is_reverse_flow
            
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
            if self.venue_projector:
                venue_flow = self.venue_projector.calculate_venue_flow(mean_dx,mean_dy)
                if np.any(venue_flow):
                    direction = self.__venue_config.get("camera",{}).get("direction","FORWARD")
                    is_reverse_flow = self.venue_projector.classify_venue_flow(venue_flow,direction)
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

            return motion_speed,motion_variance,primary_direction,is_reverse_flow

        return


    def __get_risk_info(self,person_count,motion_speed,motion_variance,is_reverse_flow):
        if person_count == 0:
            risk_score = 0
            risk_level = "GREEN"
        else:
            density = person_count / self.config.ZONE_AREA_SQM
            density_factor = min(1.0,density / self.config.CRITICAL_DENSITY_CAP)
            normalized_speed = min(1.0,motion_speed / self.V_MAX)
            normalized_variance = min(1.0,motion_variance / self.VAR_MAX)

            # Helbing Crowd Turbulence Model
            crowd_pressure = density_factor * (1.0 + (normalized_speed * normalized_variance))
            raw_risk = crowd_pressure
            
            if is_reverse_flow:
                raw_risk += 0.25  # Assumption To Increase Risk By 0.25 points
            risk_score = min(1.0, round(raw_risk,2))

        if risk_score >= 0.7:
            risk_level = "RED"
        elif risk_score >= 0.4:
            risk_level = "YELLOW"
        else:
            risk_level = "GREEN"

        return risk_score,risk_level


    def __calculate_time_to_crush(self,curr_timestamp,curr_count):
        t_crush = None
        self.history_buffer.append((curr_timestamp,curr_count))
        if len(self.history_buffer) < 2:
            return 0.0,t_crush

        old_timestamp,old_count = self.history_buffer[0]
        time_delta = curr_timestamp - old_timestamp
        if time_delta <= 0.0:
            return 0.0,t_crush
        
        net_flow_rate = (curr_count - old_count) / time_delta
        if curr_count >= self.N_MAX:
            t_crush = 0.0
        elif net_flow_rate > 0:
            t_crush_sec = (self.N_MAX - curr_count) / net_flow_rate
            t_crush =  round(t_crush_sec / 60,1)
        else: #Crowd is stable / dispersing
            t_crush = None

        return net_flow_rate,t_crush


    def __detect_anomalies(self,person_count,motion_speed,motion_variance,net_flow_rate,is_reverse_flow):
        self.speed_buffer.append(motion_speed)
        self.variance_buffer.append(motion_variance)

        anomalies = {
            "sudden_surge" : False,
            "panic_onset" : False,
            "panic_propagation" : False,
            "rapid_dispersal" : False,
            "reverse_flow" : is_reverse_flow
        }

        if len(self.variance_buffer) < 5:
            return anomalies

        #Calculating Baselines Of Physics Properties
        count_history = list(item[0] for item in self.history_buffer)
        baseline_speed = float(np.mean(list(self.speed_buffer)[:-3]))
        baseline_variance = float(np.mean(list(self.variance_buffer)[:-3]))
        baseline_count = float(np.mean(count_history[:-5])) if len(count_history) > 5 else person_count

        #Capping Value To Near Zero
        baseline_speed = max(baseline_speed,1e-6)
        baseline_variance = max(baseline_variance,1e-6)
        baseline_count = max(baseline_count,1.0)

        #Sudden Surge
        surge_ratio = person_count / baseline_count
        if surge_ratio > 1.3 and net_flow_rate > 2.0:
            anomalies["sudden_surge"] = True

        #Panic Onset
        speed_spike = motion_speed / baseline_speed
        variance_spike = motion_variance / baseline_variance
        if variance_spike > 2.5 and speed_spike > 1.6:
            anomalies["panic_onset"] = True

        #Panic Propagation
        recent_variances = list(self.variance_buffer)[:-5]
        continous_turbulance = all(v > baseline_variance * 2.0 for v in recent_variances)
        if continous_turbulance and (is_reverse_flow or speed_spike > 2.0):
            anomalies["panic_propagation"] = True

        #Rapid Dispersal
        if surge_ratio < 0.55 and net_flow_rate < -3.0:
            anomalies["rapid_dispersal"] = True

        return anomalies


    def __get_actionable_recommendations(self,risk_level,heat_boxes):
        gate_radius = 25
        gate_actions = []
        security_staff = 0
        public_announcements = {}

        for gate in  self.__venue_config.get("gates",[]):
            pressure = 0
            x2 = gate.get("x",0)
            y2 = gate.get("y",0)
            for point in heat_boxes:
                x1 = point.get("x",0)
                y1 = point.get("y",0)
                distance = np.sqrt(((x2-x1) ** 2) + ((y2-y1) **2))
                if distance <= gate_radius:
                    distance_factor = max(0,1-(distance/gate_radius))
                    pressure += point["density"] * distance_factor
            
            if pressure > 0.75:
                action = "CLOSE TEMPORARILY"
            elif pressure > 0.50:
                action = "RESTRICT INFLOW"
            elif pressure > 0.25:
                action = "MONITOR"
            else:
                action = "NORMAL OPERATION"
            gate_actions.append({"gate":gate,"pressure" : float(pressure),"action":action,"role":"NORMAL"})

        ranked_gates = sorted(gate_actions,key=lambda g:g["pressure"],reverse=True)
        if not ranked_gates:
            public_announcements = {
                "english": "All gates are operating normally.Please proceed safely.",
                "hindi": "सभी गेट सामान्य रूप से काम कर रहे हैं। कृपया सावधानी से आगे बढ़ें।"
            }
            return gate_actions,security_staff,public_announcements

        crowded_gate = ranked_gates[0]
        crowded_gate["role"] = "CONGESTED"
        diversion_gates = [g for g in ranked_gates[1:] if g["pressure"] < 0.50]
        diversion_gates = sorted(diversion_gates,key=lambda g:g["pressure"])
        if risk_level == "RED" or risk_level == "YELLOW":
            for gate_info in diversion_gates[:2]:
                gate_info["role"] = "DIVERSION"
                if gate_info["pressure"] <= 0.25:
                    gate_info["action"] = "OPEN FOR DIVERSION"
                elif gate_info["pressure"] <= 0.50:
                    gate_info["action"] = "PREPARE FOR DIVERSION"

        #Get Crowded And Diversion Gate Names
        crowded_gate_name = crowded_gate.get("gate",{}).get("name","")
        diversion_gate_names = [diversion_gate.get("gate",{}).get("name","") for diversion_gate in diversion_gates]
        
        if risk_level == "RED":
            security_staff = 8
            if diversion_gate_names:
                diversion_text = ", ".join(diversion_gate_names)

                public_announcements = {
                    "english": f"Attention! {crowded_gate_name} is temporarily paused due to high crowd density Please follow ground stewards towards {diversion_text}.",
                    "hindi": f"ध्यान दें! ज़्यादा भीड़ की वजह से {crowded_gate_name} को कुछ समय के लिए रोक दिया गया है। कृपया ज़मीन पर मौजूद कर्मचारियों के बताए अनुसार {diversion_text} की ओर जाएँ।"
                }
            else:
                public_announcements = {
                    "english": f"Attention! high crowd density has been detected near {crowded_gate_name}. Please follow instructions from security personnel",
                    "hindi": f"ध्यान दें! {crowded_gate_name} के पास बहुत ज़्यादा भीड़ देखी गई है। कृपया सुरक्षा कर्मियों के निर्देशों का पालन करें।"
                }
        elif risk_level == "YELLOW":
            security_staff = 3
            if diversion_gate_names:
                diversion_text = ", ".join(diversion_gate_names)
                
                public_announcements = {
                    "english": f"Crowd is increasing near {crowded_gate_name}. Please maintain a steady walking pace and use {diversion_text} where possible.",
                    "hindi": f"{crowded_gate_name} के पास भीड़ बढ़ रही है। कृपया चलने की गति एक जैसी रखें और जहाँ संभव हो {diversion_text} का इस्तेमाल करें।"
                }
            else:
                public_announcements = {
                    "english": f"Crowd is increasing near {crowded_gate_name}. Please maintain a steady walking pace and avoid stopping.",
                    "hindi": f"{crowded_gate_name} के पास भीड़ बढ़ रही है। कृपया चलने की गति एक जैसी बनाए रखें और रुकने से बचें।"
                }
        else:
            security_staff = 0
            public_announcements = {
                "english": "All gates are operating normally.Please proceed safely.",
                "hindi": "सभी गेट सामान्य रूप से काम कर रहे हैं। कृपया सावधानी से आगे बढ़ें।"
            }
        return gate_actions,security_staff,public_announcements