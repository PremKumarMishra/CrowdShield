from dataclasses import dataclass
import numpy as np

@dataclass
class RecommendationResult:
    gate_actions:list
    security_staff:int
    public_announcements:dict


class RecommendationEngine:
    def __init__(self,config,vconfig):
        self.config = config
        self.vconfig = vconfig

    def get_recommendations(self,risk_level,heat_boxes):
        gate_actions = []
        security_staff = 0
        public_announcements = {}

        for gate in self.vconfig.get("gates",[]):
            pressure = 0
            x2 = gate.get("x",0)
            y2 = gate.get("y",0)
            for point in heat_boxes:
                x1 = point.get("x",0)
                y1 = point.get("y",0)
                distance = np.sqrt(((x2-x1) ** 2) + ((y2-y1) **2))
                if distance <= self.config.GATE_RADIUS:
                    distance_factor = max(0,1-(distance/self.config.GATE_RADIUS))
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
            public_announcements = {"english": "All gates are operating normally.Please proceed safely."}
            return RecommendationResult(gate_actions,security_staff,public_announcements)

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

                public_announcements = {"english": f"Attention! {crowded_gate_name} is temporarily paused due to high crowd density Please follow ground stewards towards {diversion_text}."}
            else:
                public_announcements = {"english": f"Attention! high crowd density has been detected near {crowded_gate_name}. Please follow instructions from security personnel"}
        elif risk_level == "YELLOW":
            security_staff = 3
            if diversion_gate_names:
                diversion_text = ", ".join(diversion_gate_names)
                public_announcements = {"english": f"Crowd is increasing near {crowded_gate_name}. Please maintain a steady walking pace and use {diversion_text} where possible."}
            else:
                public_announcements = {"english": f"Crowd is increasing near {crowded_gate_name}. Please maintain a steady walking pace and avoid stopping."}
        else:
            security_staff = 0
            public_announcements = {"english": "All gates are operating normally.Please proceed safely."}
        return RecommendationResult(gate_actions,security_staff,public_announcements)