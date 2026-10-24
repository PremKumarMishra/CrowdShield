# CrowdShield Setup & Installation Guide

This document outlines the dependencies and run instructions for the three primary components of the CrowdShield system: Backend, Command Center Dashboard, and Mobile App.

## 1. Backend Server (`backend/`)

The backend is built with FastAPI and runs the core computer vision and intelligence engines.

**Prerequisites:**
- Python Version: **Python 3.12.10 (64-bit)**
- A `requirements.txt` file is present in the `backend` directory containing all Python dependencies (e.g., FastAPI, Uvicorn, OpenCV, Ultralytics YOLO, Sarvam AI, Numpy).

**Installation & Run Process:**
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the backend server:
   ```bash
   python server.py
   ```
   *The server will start on `http://0.0.0.0:8000` with WebSocket connections available.*

---

## 2. Command Center Dashboard (`Command-Center-Dashboard/`)

The web dashboard is built using React, Vite, and Tailwind CSS.

**Core Dependencies (`package.json`):**
- **Framework**: `react` (^19.2.7), `react-dom` (^19.2.7), `vite` (^8.1.0)
- **Styling**: `tailwindcss` (^4.3.3), `@tailwindcss/vite`
- **Mapping & Data Vis**: `leaflet` (^1.9.4), `leaflet.heat` (^0.2.0) for the heatmap overlays, `chart.js` (^4.5.1), `chart`
- **Network**: `axios` (^1.19.0)

**Installation & Run Process:**
1. Ensure Node.js and NPM are installed.
2. Navigate to the dashboard directory:
   ```bash
   cd Command-Center-Dashboard
   ```
3. Install all Node.js/NPM libraries:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The dashboard will connect to the backend's WebSocket to receive live telemetry.*

---

## 3. CrowdShield Mobile App (`CrowdShieldApp/`)

The mobile application is built using Expo (React Native). It utilizes native device sensors for haptics, indoor positioning, and audio recording.

**Core Dependencies (`package.json`):**
- **Framework**: `react` (19.2.3), `react-native` (0.86.2)
- **Expo & Expo CLI Version**: `expo` (~57.0.13). You will need `npx` (Node Package eXecute, bundled with Node.js) to run Expo commands.
- **Expo Libraries**: 
  - `expo-audio` (~57.0.4) for SOS microphone recording.
  - `expo-haptics` (~57.0.1) for vibration-based alerts.
  - `expo-sensors` (~57.0.2) for Accelerometer and Magnetometer (IPS tracking).
  - `expo-location` (~57.0.10) for GPS positioning.
  - `expo-file-system`, `expo-network`, `expo-constants`, `expo-status-bar`.
- **Other React Native Libraries**: `react-native-maps`, `react-native-svg`, `@expo/vector-icons`, `@react-native-async-storage/async-storage`.

**Installation & Run Process:**
1. Ensure Node.js (which includes `npx`) is installed.
2. Navigate to the mobile app directory:
   ```bash
   cd CrowdShieldApp
   ```
3. Install the dependencies using npm:
   ```bash
   npm install
   ```
   *(Alternatively, you can install the Expo CLI globally if desired, though running via `npx expo` is standard).*
4. Start the Expo Metro Bundler:
   ```bash
   npx expo start
   ```
5. Scan the QR code with the Expo Go app on your physical iOS/Android device to run the app natively. It will connect to the backend via WebSocket to receive alerts and stream SOS audio. (Currently tested with client version 57.0.3)

---

## Summary of the Full Execution Sequence

To bring the entire CrowdShield platform online, run the components in this exact order:

1. **Step 1:** Setup and run `server.py` from the `backend` folder. This initializes the YOLO models, homography engines, and WebSocket broadcasters.
2. **Step 2:** Setup and run the `Command-Center-Dashboard`. It will establish a connection to the running backend.
3. **Step 3:** Setup and run the `CrowdShieldApp` via Expo. Mobile clients will fetch the venue configuration and begin listening for anomaly alerts while feeding sensor data to the server upon SOS triggers.
