import cv2
import numpy as np
class VideoStabilizer:
    def __init__(self,config):
        self.config = config
        #Status Tracking
        self.tracked_points = None
        self.prev_gray_frame = None

    def stabilize(self,frame):
        gray = cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
        gray_frame = cv2.resize(gray,(self.config.FLOW_WIDTH,self.config.FLOW_HEIGHT))
        if self.prev_gray_frame is not None:
            #Stablize The Video When Stablization Point Is Above ThresHold Value
            if self.tracked_points is None or len(self.tracked_points) < self.config.STABILIZATION_POINT_THRESHOLD:
                self.tracked_points = cv2.goodFeaturesToTrack(self.prev_gray_frame, maxCorners=150, qualityLevel=0.01, minDistance=15)
            if self.tracked_points is not None and len(self.tracked_points) > 0:
                next_pts, status, _ = cv2.calcOpticalFlowPyrLK(self.prev_gray_frame, gray_frame, self.tracked_points, None)
                valid_idx = np.where(status == 1)[0]
                if len(valid_idx) > 10:
                    transform_matrix, _ = cv2.estimateAffinePartial2D(next_pts[valid_idx], self.tracked_points[valid_idx], method=cv2.RANSAC)
                    if transform_matrix is not None:
                        h_proc, w_proc = frame.shape[:2]
                        transform_matrix[0, 2] *= (w_proc / self.config.FLOW_WIDTH)
                        transform_matrix[1, 2] *= (h_proc / self.config.FLOW_HEIGHT)
                        frame = cv2.warpAffine(frame, transform_matrix, (w_proc, h_proc))
                        gray_frame = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (self.config.FLOW_WIDTH, self.config.FLOW_HEIGHT))
                    #Update Tracked Points For Next Frame
                    self.tracked_points = next_pts[valid_idx].reshape(-1, 1, 2)
                else:
                    #If Points Are Lost Force ReDetect On Next Frame
                    self.tracked_points = None

        self.prev_gray_frame = gray_frame
        return frame,gray_frame