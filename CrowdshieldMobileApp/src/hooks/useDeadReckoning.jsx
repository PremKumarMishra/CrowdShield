import { useState,useRef,useEffect } from "react";
import {Accelerometer,Magnetometer} from 'expo-sensors'

//Assumptions
const STEP_LENGTH = 1 //0.7 (prev)
const STEP_THRESHOLD = 1.2
const STEP_COOLDOWN_MS = 300

export const useDeadReckoning = (initPos,containerDim,venueConfig) =>
{
    //Steps ANd References
    const [position,setPosition] = useState(initPos)
    const posRef = useRef(initPos)
    const headRef = useRef(0)
    const lastStepRef = useRef(0)
    const wasAbove = useRef(false)


    //Sync References With Position Changes
    useEffect(() => {
        if (initPos)
        {   
            posRef.current = initPos
            setPosition(initPos)
        }
    },[initPos])

    //MagnetoMeter Tracking
    useEffect(() => {
        Magnetometer.setUpdateInterval(100)
        const subscription = Magnetometer.addListener(({x,y}) => {
            let angle = Math.atan2(y,x)
            angle = (Math.PI / 2 - angle + 2 * Math.PI) % (2 * Math.PI)
            headRef.current = angle
        })

        return () => 
        {
            subscription.remove()
        }
    },[])

    //Accelerometer Tracking
    useEffect(() => {
        if(!venueConfig?.dimensions || !containerDim?.width)
        {
            return
        }
        
        const venue_width = venueConfig.dimensions[0]
        const venue_height = venueConfig.dimensions[1]

        const meter_to_pixelX = containerDim.width / venue_width
        const meter_to_pixelY = containerDim.height / venue_height

        
        Accelerometer.setUpdateInterval(50)        
        const subscription  = Accelerometer.addListener(({x,y,z}) => {
            const mag = Math.sqrt(x*x+y*y+z*z)
            
            const now = Date.now()
            if (mag > STEP_THRESHOLD)
            {
                wasAbove.current = true
            }
            else if (wasAbove.current && (now - lastStepRef.current) > STEP_COOLDOWN_MS)
            {
                wasAbove.current = false
                lastStepRef.current = now
                
                const heading = headRef.current
                const dx = STEP_LENGTH * Math.sin(heading)
                const dy = -STEP_LENGTH * Math.cos(heading)
                
                const prev = posRef.current
                const px = Math.max(0,Math.min(containerDim.width,prev.px + dx * meter_to_pixelX))
                const py = Math.max(0,Math.min(containerDim.height,prev.py + dy * meter_to_pixelY))                
                
                const newPos = {px,py}
                posRef.current = newPos
                setPosition(newPos)
                // console.log({heading,dx,dy,moveX :dx * meter_to_pixelX,moveY :dy * meter_to_pixelY,previous: prev});
            }
        })
        
        return () => 
        {
            subscription.remove()
        }

    },[venueConfig,containerDim])

    return position
}