import { useEffect, useRef } from "react"
import { Vibration } from "react-native";


export const useVibration = (status) =>
{
    const prevStatusRef = useRef(null);
    const vibrationPattern = [0,1200,250,1000,250,1500];
    useEffect(() => {
        if (status === "DANGER" && prevStatusRef.current !== "DANGER")
        {
            Vibration.cancel()
            Vibration.vibrate(vibrationPattern)
        }
        if (status !== "DANGER" && prevStatusRef.current === "DANGER")
        {
            Vibration.cancel()
        }
        prevStatusRef.current = status
    },[status])
}
