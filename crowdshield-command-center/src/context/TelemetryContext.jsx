import React from 'react'
import {useState,createContext,useContext,useEffect} from 'react'
import { PACKET } from './NetworkPackets';

export const telemetryContext = createContext();

//Hooks
export const useTelemetryContext = () =>
{
    const context = useContext(telemetryContext)
    if(!context)
    {
        throw new Error("useNetworkActions must be used within a NetworkProvider");
    }
    return context.telemetry
}

export const useSosContext = () =>
{
    const context = useContext(telemetryContext)
    if(!context)
    {
        throw new Error("useNetworkActions must be used within a NetworkProvider");
    }
    return context.sosMarkers
}

export const useIncidentContext = () =>
{
    const context = useContext(telemetryContext)
    if(!context)
    {
        throw new Error("useNetworkActions must be used within a NetworkProvider");
    }
    return {incidents:context.incidents,setIncidents:context.setIncidents}
}

const TelemetryContext = ({children}) => {
    const [telemetry,setTelemetry] = useState({connected: null});
    const [sosMarkers, setSosMarkers] = useState([])
    const [incidents,setIncidents] = useState([])

    useEffect(() => {
        let ws;
        const connect = () => {
            ws = new WebSocket("ws://localhost:8000/ws/web")    
            ws.onopen = (event) => {                
                setTelemetry(prev => ({...prev,connected:true}))
            }
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                if (data?.type === PACKET.TELEMETRY)
                {
                    setTelemetry(prev => ({...prev,connected:true,data}))
                }
                else if (data?.type == PACKET.SOS)
                {
                    // console.log(data);
                    setSosMarkers((prev) => [...prev,data])
                }
                else if (data?.type == PACKET.INCIDENT)
                {
                    console.log(incidents,data);
                    
                    setIncidents((prev) => [...prev,data])
                }
            }
            ws.onerror = (error) => 
            {   
                setTelemetry(prev => ({...prev,connected:null}))
            }
            ws.onclose = (error) => 
            {
                setTelemetry(prev => ({...prev,connected:false}))
                setTimeout(connect, 2000);
            }
        }
        connect();
        return () => {
            ws?.close()
        }
    },[])

    return (
        <telemetryContext.Provider value={{telemetry,sosMarkers,incidents,setIncidents}}>
            {children}
        </telemetryContext.Provider>
    )
}

export default TelemetryContext
