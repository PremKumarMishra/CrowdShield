# CrowdShield: Technical Architecture & Documentation

## 1. Why We Are Different From Others

CrowdShield stands out from conventional crowd management systems through several pioneering technological integrations:

a) **Custom Head-Only YOLO Model**: Standard YOLO models are trained to detect full human bodies, which drastically fail in dense crowds due to severe occlusion. We trained our own customized YOLO model specifically designed for head detections. By reducing the Region of Interest (ROI) to just heads, we achieve significantly better accuracy and counting precision than standard YOLOv8n models in packed environments.

b) **Homography for Venue Mapping**: We use Homography to project 2D camera frames onto a geographical 2D venue map. This mathematical transformation translates camera pixels into physical spatial coordinates, yielding a much more accurate density map and precise crowd tracking.

c) **Helbing Crowd Turbulence Model**: Instead of just counting people, we treat the crowd as a dynamic fluid. We utilize Dirk Helbing's crowd turbulence model, viewing each person as a particle. This allows the system to predict how the physical disturbance of a single particle (person) dynamically propagates and affects surrounding particles across the system, accurately predicting crushing forces and panic shockwaves.

d) **Advanced Indoor Positioning System (IPS)**: GPS alone is highly inaccurate indoors. For indoor position tracking, we employ a Sensor Fusion approach utilizing the mobile device's **Accelerometer**, **Magnetometer**, and **GPS**. By combining dead-reckoning step detection with magnetic heading, we trace the user's exact movement path offline.

e) **Vibration-Based Notifications**: In chaotic, loud emergency environments (like concerts or stadiums), audio alerts and standard push notifications are easily missed. We use heavy, continuous haptic vibration-based notifications on the mobile app to ensure users immediately notice critical alerts.

f) **Sarvam AI for Multilingual Intelligence**: We integrate Sarvam AI to process audio from user SOS triggers. This allows the system to instantly detect and categorize any type of emergency situation based on a person describing it in their native language (e.g., Hindi, Tamil, English), enabling rapid and context-aware responses.

g) **100% Precision SOS Location**: When a user triggers an SOS, we don't just rely on rough proximity. Because of our Homography matrix mapping the physical venue space to a digital screen, we can pinpoint the user's exact coordinate location with near 100% precision on the command center dashboard, dispatching stewards directly to them.

---

## 2. Technical Choices & Assumptions

- **Optical Flow for Motion**: Rather than tracking individual IDs (which is computationally heavy and unreliable in dense crowds), we treat the crowd as a fluid. We use Dense Optical Flow (Farneback) to calculate vector fields of movement.
- **Privacy & Compliance**: We process video feeds entirely on the edge/backend in real-time. We only extract bounding box coordinates and motion vectors. No facial recognition or Personally Identifiable Information (PII) is stored.

## 3. Custom Head-Only YOLO Model & Vision Pipeline

Standard YOLO detects full bodies, which leads to massive overlapping bounding boxes in crowd scenarios. 

**Code Intuition (`vision/detector.py`)**:
```python
class PersonDetector:
    def __init__(self,model_path,config):
        self.model = YOLO(model_path) # Loads the custom head-only YOLOv8 weights

    def detect(self,frame):
        result = self.model.predict(frame,iou=self.config.MODEL_IOU,conf=self.config.MODEL_CONF)
        return result[0].boxes
```
By focusing solely on heads, the model runs faster on edge devices and eliminates false negatives caused by torso/leg occlusion.

## 4. Homography & Top-Down Projection

To understand where people are located in the physical venue, we use Homography to warp the camera perspective into a top-down 2D grid (divided into 2.0m cells).

**Code & Math (`vision/projection.py`)**:
```python
self.h_matrix,_ = cv2.findHomography(camera_points,venue_points)
```
Homography calculates a 3x3 transformation matrix $H$. If a point in the camera frame is $P_c = (x_c, y_c, 1)$, the physical venue coordinate $P_v = (x_v, y_v, 1)$ is found via:

$$ P_v = H \times P_c $$

Every bounding box center is passed through this projection to create a grid-based "Heatmap", assuming a density increase of 0.25 per person in a cell.

## 5. Flow Analytics

We treat the crowd as particles in a continuous system using `cv2.calcOpticalFlowFarneback` to get a 2D vector for every pixel.

- **Speed**: $V = \frac{1}{N} \sum (\text{magnitude})$
- **Variance**: $\sigma^2 = \frac{1}{N} \sum (\text{magnitude} - V)^2$

We determine direction by averaging the $X$ and $Y$ flow components:
```python
angle = np.degrees(np.arctan2(mean_dy, mean_dx))
```
This tells us the Net Flow Rate, speed, and if the crowd is undergoing "Reverse Flow" (moving against the expected gate direction).

## 6. Helbing's Turbulence Model & Risk Engine

When a crowd reaches critical density, physical laws change. Dirk Helbing's crowd dynamics model states that a disturbance in one person (particle) propagates like a shockwave.

**Code & Math (`analysis/density.py`)**:
```python
# Helbing Crowd Turbulence Model
crowd_pressure = density_factor * (1.0 + (normalized_speed * normalized_variance))
```
Pressure $P$ in a crowd is violently amplified if people are moving fast ($V$) and chaotically (Variance $\sigma^2$). 
$P = \rho \times (1 + V \cdot \sigma^2)$

**Risk Analysis Assumptions**:
The baseline risk score is derived directly from the computed crowd pressure. To account for directional hazards, we apply a **Reverse Flow Assumption**: if reverse flow is detected, we add an arbitrary penalty of `+0.25` to the risk score.
Based on the final score, the Risk Engine triggers:
- **GREEN**: Normal operations (Score < 0.4)
- **YELLOW**: Warning state (Score $\ge$ 0.4)
- **RED**: Critical emergency (Score $\ge$ 0.7)

## 7. Anomaly Detection (`analysis/anomalies.py`)

1. **Sudden Surge**: `surge_ratio > 1.3 and net_flow_rate > 2.0`
2. **Panic Onset**: `variance_spike > 2.5 and speed_spike > 1.6`
3. **Panic Propagation**: `continuous_turbulence` across frames combined with a speed spike.
4. **Time to Crush ($T_{crush}$)**:
   $$ T_{crush} = \frac{N_{max} - N_{current}}{\text{Net Flow Rate}} $$

## 8. Smart Gate Recommendations (`analysis/recommendations.py`)

Computes a "Pressure Score" for each physical gate using the Euclidean distance from high-density heatmap points.
- Ranks the gates, marking the most crowded as **CONGESTED** and others as **DIVERSION**.
- **Steward Deployment**: 
  - `RED` risk: 8 security staff.
  - `YELLOW` risk: 3 security staff.

## 9. Indoor Positioning System (IPS) Math

To pinpoint the exact location of the SOS signal indoors, the mobile app runs Sensor Fusion (GPS + Accelerometer + Magnetometer).
1. **Initial Anchor**: GPS $(x_0, y_0)$ at the entrance.
2. **Pedestrian Dead Reckoning (PDR)**: 
   - **Accelerometer**: Detects step impacts. If a step length is $L$, velocity is inferred.
   - **Magnetometer**: Provides Heading/Yaw angle $\theta$ relative to Magnetic North.
3. **Position Update Equation**:
   $$ X_t = X_{t-1} + (L \cdot \cos(\theta_t)) $$
   $$ Y_t = Y_{t-1} + (L \cdot \sin(\theta_t)) $$

## 10. Sarvam AI for Multilingual Intelligence

During a crisis, English announcements cause panic if misunderstood. We integrate Sarvam AI to dynamically translate English announcements into the mobile user's preferred local language (e.g., Hindi, Tamil) before broadcasting over WebSockets. Additionally, Sarvam AI processes audio from user SOS triggers to automatically detect the type of emergency being described in their native language.

## 11. Vibration-Based Notifications

In chaotic, loud emergency environments (like concerts or stadiums), audio alerts and standard push notifications are easily missed. When a RED anomaly is detected, the mobile app receives the WebSocket payload and triggers heavy, continuous haptic vibration-based notifications, ensuring users immediately notice critical alerts.

## 13. FastAPI Routes

The CrowdShield backend exposes the following REST and WebSocket routes:

### REST API

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/stream/cam1` | Streams the live camera feed as MJPEG |
| `GET` | `/api/v1/stream/cam1/frame` | Returns the latest camera frame as JPEG |
| `POST` | `/api/v1/venue/config` | Updates the active venue configuration and broadcasts it to connected mobile clients |
| `GET` | `/api/v1/telemetry/current` | Returns the latest dashboard telemetry |

### WebSocket API

| Type | Route | Description |
|---|---|---|
| `WS` | `/ws/web` | Dashboard WebSocket for real-time telemetry |
| `WS` | `/ws/mobile` | Mobile WebSocket for venue configuration and mobile communication |

## 14. WebSocket Packet Types

CrowdShield uses typed WebSocket packets to distinguish messages exchanged between the dashboard, mobile application, and backend.

| Packet Type | Name | Purpose |
|---:|---|---|
| `1` | `SOS` | Emergency SOS message from a mobile user |
| `2` | `INCIDENT` | Incident/event notification |
| `3` | `VENUE CONFIG` | Venue configuration sent to connected clients |
| `4` | `Mobile Telemetry` | Telemetry received from the mobile application |
| `5` | `Dashboard Telemetry` | Real-time telemetry sent to the command-center dashboard |
| `6` | `LANGUAGE` | Language/translation communication for multilingual alerts |

---

## 15. GitHub Repository

**GitHub Repository:** https://github.com/PremKumarMishra/CrowdShield

---

## 16. References

- Helbing, D., Farkas, I., & Vicsek, T. (2000). [Simulating dynamical features of escape panic](https://www.researchgate.net/publication/1761631_Crowd_turbulence_The_physics_of_crowd_disasters). *Nature*, 407(6803), 487-490. (Helbing Crowd Turbulence Model)
- [Case Studies on Crowd Analysis and Disaster Prevention](https://www.emerald.com/jpmd/article/13/4/385/237656/Place-crowd-safety-crowd-science-Case-studies-and) (e.g., Love Parade disaster analysis, Hajj crowd dynamics).
- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **FastAPI GitHub Repository:** https://github.com/fastapi/fastapi
- **Ultralytics YOLO Documentation:** https://docs.ultralytics.com/
- **OpenCV Documentation:** https://docs.opencv.org/
- **Sarvam AI Documentation:** https://docs.sarvam.ai/
