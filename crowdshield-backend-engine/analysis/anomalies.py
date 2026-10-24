from collections import deque
from dataclasses import dataclass
import numpy as np

@dataclass
class AnomalyResult:
    sudden_surge:bool 
    panic_onset:bool
    panic_propagation:bool
    rapid_dispersal:bool
    reverse_flow:bool
    net_flow_rate:float
    t_crush:float

class AnomalyEngine:
    def __init__(self,config):
        self.config = config
        self.history_buffer = deque(maxlen=self.config.HISTORY_SIZE)
        self.variance_buffer = deque(maxlen=self.config.PHYSICS_HISTORY_SIZE)
        self.speed_buffer = deque(maxlen=self.config.PHYSICS_HISTORY_SIZE) 
        
        #Physical Limits
        self.N_SAFE:float = self.config.ZONE_AREA_SQM * self.config.SAFE_DENSITY_CAP
        self.N_MAX = self.config.ZONE_AREA_SQM * self.config.CRITICAL_DENSITY_CAP

    def calculate_time_to_crush(self,curr_timestamp,curr_count):
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

    def get_anomalies(self,curr_timestamp,person_count,motion_speed,motion_variance,is_reverse_flow):
        sudden_surge = False
        panic_onset = False
        panic_propagation = False
        rapid_dispersal = False
        net_flow_rate,t_crush = self.calculate_time_to_crush(curr_timestamp,person_count)
        self.speed_buffer.append(motion_speed)
        self.variance_buffer.append(motion_variance)

        if len(self.variance_buffer) < 5:
            return AnomalyResult(sudden_surge,panic_onset,panic_propagation,rapid_dispersal,is_reverse_flow,net_flow_rate,t_crush)

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
            sudden_surge = True

        #Panic Onset
        speed_spike = motion_speed / baseline_speed
        variance_spike = motion_variance / baseline_variance
        if variance_spike > 2.5 and speed_spike > 1.6:
            panic_onset = True

        #Panic Propagation
        recent_variances = list(self.variance_buffer)[:-5]
        continous_turbulance = all(v > baseline_variance * 2.0 for v in recent_variances)
        if continous_turbulance and (is_reverse_flow or speed_spike > 2.0):
            panic_propagation = True

        #Rapid Dispersal
        if surge_ratio < 0.55 and net_flow_rate < -3.0:
            rapid_dispersal = True

        return AnomalyResult(sudden_surge,panic_onset,panic_propagation,rapid_dispersal,is_reverse_flow,net_flow_rate,t_crush)



    


