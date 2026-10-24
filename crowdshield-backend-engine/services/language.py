from sarvamai import SarvamAI
import hashlib
class LanguageService:
    def __init__(self,app_config):
        self.app_config = app_config
        self.sarvam = SarvamAI(api_subscription_key=self.app_config.SARVAM_API_KEY)
        self.__cache = {}

    def __cache_key(self,text,lang):
        key_hash = hashlib.md5(text.lower().encode("utf-8")).hexdigest()
        return f"{key_hash}:{lang}"

    def transcribe(self,audio):
        try:
            transcript = self.sarvam.speech_to_text.transcribe(file=audio,model="saaras:v3",language_code="unknown",mode='translate').transcript
        except Exception as e:
            print("failed to transcribe",e)
            transcript = None
        return transcript

    def translate(self,text,targetLang):
        translated_text = text

        cached_key = self.__cache_key(text,targetLang)
        if cached_key in self.__cache:
            # print("Cache Working")
            translated_text = self.__cache[cached_key]
        else:
            try:
                translated_text = self.sarvam.text.translate(input=text,mode="classic-colloquial",source_language_code="en-IN",target_language_code=targetLang).translated_text
                self.__cache[cached_key] = translated_text
            except:
                pass
        return translated_text