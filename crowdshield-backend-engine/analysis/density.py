import numpy as np
class DensityAnalyzer:
    def __init__(self,config):
        self.config = config
        #Max Velocity And Variance
        self.V_MAX = np.sqrt(self.config.FLOW_WIDTH**2 + self.config.FLOW_HEIGHT**2)
        self.VAR_MAX = (self.V_MAX ** 2) / 4.0

    def calculate_pressure(self, person_count,motion_speed,motion_variance):
        density = person_count / self.config.ZONE_AREA_SQM
        density_factor = min(1.0,density / self.config.CRITICAL_DENSITY_CAP)
        normalized_speed = min(1.0,motion_speed / self.V_MAX)
        normalized_variance = min(1.0,motion_variance / self.VAR_MAX)

        # Helbing Crowd Turbulence Model
        crowd_pressure = density_factor * (1.0 + (normalized_speed * normalized_variance))
        return crowd_pressure