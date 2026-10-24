from dataclasses import dataclass

@dataclass
class RiskResult:
    score: float
    level: str

class RiskEstimator:
    def estimate(self,person_count,crowd_pressure,reverse_flow):
        if person_count == 0:
            risk_score = 0
            risk_level = "GREEN"
        else:
            risk_score = crowd_pressure
            if reverse_flow:
                risk_score+=0.25 # Assumption To Increase Risk By 0.25 points
            risk_score = min(1.0, round(risk_score,2))

        if risk_score >= 0.7:
            risk_level = "RED"
        elif risk_score >= 0.4:
            risk_level = "YELLOW"
        else:
            risk_level = "GREEN"

        return RiskResult(risk_score,risk_level)

