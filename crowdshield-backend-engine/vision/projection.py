import numpy as np
import cv2

EXPECTED_DIRECTIONS = {
    "FORWARD" : np.array([0,-1],dtype=np.float32),
    "BACKWARD" : np.array([0,1],dtype=np.float32),
    "LEFT" : np.array([-1,0],dtype=np.float32),
    "RIGHT" : np.array([1,0],dtype=np.float32)
}

class VenueProjectionEngine:
    def __init__(self,vconfig,cell_size=2.0):
        self.vconfig = vconfig
        self.cell_size = cell_size
        self.venue_width = None
        self.venue_height = None
        self.rows = None
        self.cols = None
        self.grid = None
        self.h_matrix = None
        self.setup()

    def setup(self):
        if not self.vconfig:
            return
        self.venue_width = self.vconfig["dimensions"][0]
        self.venue_height = self.vconfig["dimensions"][1]
        self.rows = int(self.venue_height / self.cell_size)
        self.cols = int(self.venue_width / self.cell_size)
        self.grid = np.zeros((self.rows,self.cols),dtype=np.float32)

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
        direction = EXPECTED_DIRECTIONS.get(expected_direction)
        if norm_venue_flow is None or direction is None:
            return False
        alignment = float(np.dot(norm_venue_flow,direction))
        if alignment < -0.7:
            return True

        return False


    def process(self,boxes,frame_height,frame_width):
        if self.h_matrix is None:
            return []
        
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