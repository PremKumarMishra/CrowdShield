import base64 as b64
import re
class IncidentService:
    def __init__(self,language_service):
        self.language_service = language_service
        self.allowed_categories = {
        "MEDICAL_EMERGENCY": ["doctor","medical","hospital","patient","blood","bleeding","heart","pain","unconscious","fainted","collapsed","ambulance","health","help"],
        "CONGESTION": ["crowd","jam","jammed","stuck","blocked","gate","path","traffic","moving slow","cannot walk","barricade","route","road"],
        "STAMPEDE_RISK": ["crush","stampede","suffocating","trampled","trapped","surging","pushing","panic","barrier break","overcrowded","cannot breathe","squeezed"],
        "SECURITY_THREAT": ["fight","weapon","gun","knife","shooter","bomb","attack","brawl","assault","violence","intruder","hostage","terror"],
        "FIRE_EXPLOSION": ["fire","smoke","flames","explosion","blast","gas leak","burning","spark","arson"],
        "STRUCTURAL_COLLAPSE": ["collapse","stage fell","roof fall","scaffolding down","bleachers broke","wall down","structural breakdown"]
        }
    def get_category(self,audio):
        data = dict()
        transcript = self.language_service.transcribe(b64.b64decode(audio.encode()))
        data["transcript"] = transcript
        if not transcript or len(transcript.strip()) == 0:
            data["category"] = "EMERGENCY"
        text_lower = transcript.lower()

        for keyword in self.allowed_categories["MEDICAL_EMERGENCY"]:
            if re.search(r'\b'+re.escape(keyword)+r'\b', text_lower):
                data["category"] = "MEDICAL_EMERGENCY"

        for keyword in self.allowed_categories["CONGESTION"]:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
                data["category"] = "CONGESTION"

        for keyword in self.allowed_categories["STAMPEDE_RISK"]:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
                data["category"] = "STAMPEDE_RISK"

        for keyword in self.allowed_categories["SECURITY_THREAT"]:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
                data["category"] = "SECURITY_THREAT"

        for keyword in self.allowed_categories["FIRE_EXPLOSION"]:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
                data["category"] = "FIRE_EXPLOSION"

        for keyword in self.allowed_categories["STRUCTURAL_COLLAPSE"]:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
                data["category"] = "STRUCTURAL_COLLAPSE"

        if "category" not in data:
            data["category"] = "EMERGENCY"
        return data

    
    
