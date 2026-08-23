from vision.detector import PersonDetector
from vision.stabilization import VideoStabilizer
from vision.motion import MotionAnalyzer
from vision.projection import VenueProjectionEngine as VenueProjection
from analysis.density import DensityAnalyzer
from analysis.risk import RiskEstimator
from analysis.anomalies import AnomalyEngine
from analysis.recommendations import RecommendationEngine

class VisionPipeline:
    def __init__(self, config):
        self.vconfig = dict()
        self.detector = PersonDetector(config.MODEL,config)
        self.stabilizer = VideoStabilizer(config)
        self.motion = MotionAnalyzer(self.vconfig)
        self.projection = VenueProjection(self.vconfig)
        self.density = DensityAnalyzer(config)
        self.risk = RiskEstimator()
        self.anomalies = AnomalyEngine(config)
        self.recommendations = RecommendationEngine(config,self.vconfig)

    def set_venue_config(self,config):
        self.vconfig.update(config)
        self.projection.setup()
        self.projection.calculate_homography(config.get("camera",{}))

    def get_telemetry(self,timestamp,heatmap,person_count,motion,risk,anomalies,recommendations):
        telemetry = {
            "timestamp": timestamp,
            "heat_boxes" : heatmap,
            "crowd_monitoring": {
                "person_count": person_count,
                "motion_speed": round(motion.speed, 2),
                "motion_variance": round(motion.variance, 2),
                "flow_direction": motion.direction,
                "net_flow_rate": round(anomalies.net_flow_rate,2)
            },
            "risk_prediction": {
                "risk_score": risk.score,
                "status": risk.level,
                "crush_mins": anomalies.t_crush
            },
            "anomalies" : {
                "sudden_surge" : anomalies.sudden_surge,
                "panic_onset" : anomalies.panic_onset,
                "panic_propagation" : anomalies.panic_propagation,
                "rapid_dispersal" : anomalies.rapid_dispersal,
                "reverse_flow" : anomalies.reverse_flow
            },
            "recommendations": {
                "gate_controls": recommendations.gate_actions,
                "security_staff": recommendations.security_staff,
                "safest_evacuation_route": "Route_East_Exit_2",
                "multilingual_announcements": recommendations.public_announcements
            }
        }
        return telemetry

    def process(self,frame,timestamp):
        frame, gray_frame = self.stabilizer.stabilize(frame)
        boxes = self.detector.detect(frame)
        person_count = len(boxes)
        heatmap = self.projection.process(boxes,*frame.shape[:2])
        motion = self.motion.analyze(gray_frame,person_count,self.projection)
        pressure = self.density.calculate_pressure(person_count,motion.speed,motion.variance)
        risk = self.risk.estimate(person_count,pressure,motion.reverse_flow)
        anomalies = self.anomalies.get_anomalies(timestamp,person_count,motion.speed,motion.variance,motion.reverse_flow)
        recommendations = self.recommendations.get_recommendations(risk.level,heatmap)
        return self.get_telemetry(timestamp,heatmap,person_count,motion,risk,anomalies,recommendations)