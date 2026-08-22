# CrowdShield: Real-Time Intelligent Crowd Management & Disaster Prevention System

> **Next-Generation Crowd Safety Platform** combining edge computer vision, fluid mechanics turbulence modeling, sensor-fusion indoor positioning, multi-lingual audio AI, and instant tactile emergency alerting.

---

## System Flowchart & Architecture Overview

The following diagram illustrates the complete end-to-end telemetry, computer vision processing pipeline, predictive physics calculations, and citizen mobile interactivity powering **CrowdShield**.

![CrowdShield System Architecture Flowchart](flowchart/flowchart.png)

---

## 1. Why We Are Different From Others

Conventional crowd management and event monitoring tools rely on basic headcounts or static security cameras. **CrowdShield** introduces a multi-disciplinary approach blending computer vision, theoretical physics, dynamic sensor fusion, and natural audio intelligence:

* **Custom Head-Only YOLO Model:** Standard object detection models (like stock YOLOv8) look for entire human bodies. In dense, shoulder-to-shoulder crowds, body occlusion causes severe detection failure. We trained a customized YOLO model fine-tuned specifically on human heads. By restricting the Region of Interest (ROI) exclusively to head contours, we eliminate body-occlusion false negatives and achieve unmatched counting precision in overcrowded spaces.
* **Homography Spatial Mapping:** Camera pixels alone cannot convey physical distance or crowd density. Using Homography, we map 2D camera perspectives onto physical 2D venue grids ($2.0\text{m} \times 2.0\text{m}$ cells). This mathematical transformation converts pixel coordinates into true spatial ground locations, providing an accurate, meter-by-meter density heatmap.
* **Helbing Crowd Turbulence Physics Model:** Rather than treating crowds as static headcounts, CrowdShield applies **Dirk Helbing's Crowd Turbulence Model**. We treat individuals as interactive particles within a dynamic fluid. The model calculates how localized disturbances propagate as crushing forces and panic shockwaves, warning security operators before physical crowd crushes occur.
* **Advanced Indoor Positioning System (IPS):** GPS signals degrade or fail completely inside stadiums, underground arenas, and massive halls. Our mobile platform employs **Sensor Fusion (Accelerometer + Magnetometer + GPS)** paired with **Pedestrian Dead Reckoning (PDR)** to track indoor movement trajectories offline with pinpoint accuracy.
* **Sarvam AI Voice Incident Reporting & Multilingual Announcements:**
  * **Hold-to-Speak Voice Incident Reporting:** During a crisis, typing out text is slow and inefficient. Users simply hold down the mic button in the mobile app and speak naturally in any language (e.g., *"There is a fire near gate B and people are falling"*). Our backend, powered by Sarvam AI, auto-categorizes the event, estimates severity, and dispatches rapid response stewards directly to the user's exact GPS/IPS coordinate.
  * **Personalized Multilingual Announcements:** Panic often stems from language barriers during loudspeaker alerts. CrowdShield dynamically translates emergency broadcasts into the user's personalized, preferred language (e.g., Hindi, Tamil, English) before streaming live audio or voice synthesis directly to their mobile device.
* **Vibration-Based Tactile Notifications:** In roaring concert halls or stadium chaos, standard audio chimes and push banners are frequently missed. When a critical **RED** anomaly is flagged, the app triggers continuous, high-intensity haptic vibration patterns to guarantee immediate user awareness.
* **100% Precision SOS Location:** SOS triggers map directly through our Homography spatial grid to the command center dashboard, eliminating guesswork and giving first responders accurate ground coordinates.

---

## 2. Technical Choices & Assumptions

* **Optical Flow Over Individual ID Tracking:** Multi-object tracking (MOT) with unique IDs is computationally heavy and unreliable in dense crowds. We utilize **Dense Optical Flow (Farneback)** to model crowd velocity vectors and direction fields as a unified fluid medium.
* **Edge Processing & Privacy Compliance:** Video streams are processed real-time on edge nodes or dedicated local servers. Only spatial coordinates, counts, and vector fields are transmitted. No facial recognition or Personally Identifiable Information (PII) is recorded or stored.

---

## 3. Custom Head-Only YOLO Model & Vision Pipeline

Standard body-detection models suffer from massive bounding-box overlap in high-density scenarios. 

```python
# Vision Pipeline Core Intuition (vision/detector.py)
from ultralytics import YOLO

class PersonDetector:
    def __init__(self, model_path, config):
        # Loads custom YOLOv8 weights trained exclusively on head annotations
        self.model = YOLO(model_path)
        self.config = config

    def detect(self, frame):
        # Performs real-time inference on edge frames
        result = self.model.predict(
            frame, 
            iou=self.config.MODEL_IOU, 
            conf=self.config.MODEL_CONF
        )
        return result[0].boxes
```

By focusing solely on head detections, inference speeds remain high even on edge devices while avoiding torso/leg occlusion errors.

---

## 4. Homography & Top-Down Projection

To translate pixel space into real-world venue space, a $3 \times 3$ Homography matrix $H$ is computed between annotated camera reference points and physical floorplan points.

Given a camera frame coordinate $P_c = (x_c, y_c, 1)$, the corresponding venue floor coordinate $P_v = (x_v, y_v, 1)$ is derived via matrix multiplication:

$$ P_v = H \times P_c $$

```python
# Perspective Transformation (vision/projection.py)
import cv2

self.h_matrix, _ = cv2.findHomography(camera_points, venue_points)
```

Bounding box centers are mapped onto a calibrated $2.0\text{m} \times 2.0\text{m}$ grid, incrementally building a density heatmap (assuming $+0.25$ density increment per detected person per cell).

---

## 5. Flow Analytics

Crowd motion vectors are extracted using OpenCV's Dense Optical Flow (`cv2.calcOpticalFlowFarneback`).

* **Mean Speed ($V$):** $V = \frac{1}{N} \sum (\text{magnitude})$
* **Velocity Variance ($\sigma^2$):** $\sigma^2 = \frac{1}{N} \sum (\text{magnitude} - V)^2$
* **Net Flow Direction Angle ($\theta$):**

$$ \theta = \text{atan2}(\bar{d}_y, \bar{d}_x) \times \frac{180}{\pi} $$

```python
angle = np.degrees(np.arctan2(mean_dy, mean_dx))
```

This analytics engine detects sudden flow reversals (*Reverse Flow*) when crowd movement opposes safe exit channels.

---

## 6. Helbing's Turbulence Model & Risk Engine

When crowd density crosses critical thresholds, microscopic motion gives way to macroscopic fluid dynamics. **Helbing's Crowd Turbulence Model** defines crowd pressure $P$ as:

$$ P = \rho \times (1 + V \cdot \sigma^2) $$

Where:
* $\rho$ represents local spatial crowd density.
* $V$ represents normalized mean velocity.
* $\sigma^2$ represents velocity variance (turbulence/chaos).

```python
# Analysis & Risk Computations (analysis/density.py)
crowd_pressure = density_factor * (1.0 + (normalized_speed * normalized_variance))
```

### Risk Engine Thresholds

Risk scores are derived from crowd pressure and direction penalties (e.g., $+0.25$ risk offset during Reverse Flow events):

* 🟢 **GREEN (Normal):** Risk Score $< 0.4$
* 🟡 **YELLOW (Warning):** Risk Score $\ge 0.4$
* 🔴 **RED (Critical Emergency):** Risk Score $\ge 0.7$

---

## 7. Anomaly Detection & Predictive Safety

The system continually monitors video telemetry for critical behavioral anomalies:

1. **Sudden Surge:** Triggered when `surge_ratio > 1.3` and `net_flow_rate > 2.0`.
2. **Panic Onset:** Triggered when `variance_spike > 2.5` and `speed_spike > 1.6`.
3. **Panic Propagation:** Sustained high turbulence accompanied by sudden velocity spikes across consecutive frames.
4. **Time to Crush Estimate ($T_{\text{crush}}$):**

$$ T_{\text{crush}} = \frac{N_{\text{max}} - N_{\text{current}}}{\text{Net Flow Rate}} $$

---

## 8. Smart Gate Diversion & Steward Allocation

CrowdShield evaluates the proximity of spatial heatmaps relative to venue exit gates:

* Calculates **Pressure Scores** for every gate based on Euclidean distance to high-density clusters.
* Dynamically marks gates as **CONGESTED** or recommends **DIVERSION** paths.
* **Automated Security Deployment Rules:**
  * 🔴 **RED Status:** Auto-dispatches 8 security stewards to target sector.
  * 🟡 **YELLOW Status:** Auto-dispatches 3 security stewards to target sector.

---

## 9. Indoor Positioning System (IPS) & Sensor Fusion

For GPS-denied environments, the mobile app leverages **Pedestrian Dead Reckoning (PDR)** via device hardware sensors:

1. **Initial Anchor:** GPS coordinate $(X_0, Y_0)$ captured upon venue entrance.
2. **Step Detection:** Accelerometer peaks measure step strides $L$.
3. **Heading Calculation:** Magnetometer provides continuous yaw angle $\theta_t$ relative to Magnetic North.
4. **Position Update Equations:**

$$ X_t = X_{t-1} + (L \cdot \cos(\theta_t)) $$
$$ Y_t = Y_{t-1} + (L \cdot \sin(\theta_t)) $$

This guarantees uninterrupted user tracking when an SOS signal is raised indoors.

---

## 10. Sarvam AI Voice Reporting & Multilingual Engine

Emergency response requires effortless communication without language barriers.

### Key Capabilities:
* **Voice Incident Reporting:** Users hold the mic button, speak naturally about any ongoing hazard, and Sarvam AI parses the audio, categorizes the incident type, assigns severity, and attaches the exact GPS/IPS location for instant responder deployment.
* **Localized Announcements:** Automated evacuation directives are translated on the fly into each user's configured native language, reducing panic and ensuring clear understanding.

---

## 11. Tactile Emergency Alerts

When the Risk Engine detects a **RED** anomaly:
1. WebSocket payloads push alert packets to connected mobile clients.
2. The mobile app triggers heavy, repeating haptic motor patterns.
3. Users receive distinct tactile feedback even in loud, crowded, or dark stadium environments.

---

## 12. REST & WebSocket API Specifications

### REST Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/stream/cam1` | Streams live processed camera feed as MJPEG |
| `GET` | `/api/v1/stream/cam1/frame` | Captures latest single camera frame as JPEG |
| `POST` | `/api/v1/venue/config` | Updates venue geometry & broadcasts config to clients |
| `GET` | `/api/v1/telemetry/current` | Returns real-time density, turbulence & risk metrics |

### WebSocket Endpoints

| Endpoint | Target Client | Function |
|---|---|---|
| `/ws/web` | Command Center Dashboard | Broadcasts live density heatmaps, risk levels & incident logs |
| `/ws/mobile` | Citizen Mobile Application | Handles SOS signals, voice reports, and localized audio alerts |

### WebSocket Packet Protocol

| Packet Type ID | Name | Purpose |
|---:|---|---|
| `1` | `SOS` | Emergency SOS trigger from citizen mobile app |
| `2` | `INCIDENT` | Voice/manual incident report packet |
| `3` | `VENUE CONFIG` | Venue boundaries, gate maps & layout sync |
| `4` | `Mobile Telemetry` | IPS coordinates, PDR updates & sensor metrics |
| `5` | `Dashboard Telemetry` | Real-time density scores, optical flow vectors & risk states |
| `6` | `LANGUAGE` | Multilingual audio translation & localization packets |

---

## 13. Project Repository

* **GitHub Repository:** [PremKumarMishra/CrowdShield](https://github.com/PremKumarMishra/CrowdShield)

---

## 14. References & Academic Foundation

* Helbing, D., Farkas, I., & Vicsek, T. (2000). [Simulating dynamical features of escape panic](https://www.researchgate.net/publication/1761631_Crowd_turbulence_The_physics_of_crowd_disasters). *Nature*, 407(6803), 487-490.
* Still, G. K. (2014). [Place and Crowd Safety Science / Case Studies on Disaster Prevention](https://www.emerald.com/jpmd/article/13/4/385/237656/Place-crowd-safety-crowd-science-Case-studies-and).
* **FastAPI Web Framework:** [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
* **Ultralytics YOLO Docs:** [https://docs.ultralytics.com/](https://docs.ultralytics.com/)
* **OpenCV Computer Vision Library:** [https://docs.opencv.org/](https://docs.opencv.org/)
* **Sarvam AI Platform:** [https://docs.sarvam.ai/](https://docs.sarvam.ai/)
