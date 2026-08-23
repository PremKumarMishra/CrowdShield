import {useState,createContext,useEffect,useRef,useContext,useMemo,useCallback} from 'react'
import Constants from 'expo-constants';
import {PACKET} from './NetworkPackets'
import {useLanguage} from './LanguageContext'
import {File} from 'expo-file-system'

export const networkContext = createContext(null)


//Network Hooks
export const useNetworkActions = () =>
{
    const context = useContext(networkContext)
    if(!context)
    {
        throw new Error("useNetworkActions must be used within a NetworkProvider");
    }
    return {
        sendSos: context.sendSos, 
        sendIncident: context.sendIncident,
        sendLanguage: context.sendLanguage
    }
}

export const useVenueConfig = () =>
{
    const context = useContext(networkContext)
    if(!context)
    {
        throw new Error("useNetworkActions must be used within a NetworkProvider");
    }
    return context.venueConfig
}

export const useTelemetry = () =>
{
    const context = useContext(networkContext)
    if(!context)
    {
        throw new Error("useNetworkActions must be used within a NetworkProvider");
    }
    return context.telemetry
}


const NetworkContext = ({children}) => 
{
    //States
    const [telemetry,setTelemetry] = useState({})
    const [venueConfig,setVenueConfig] = useState({})
    //Refs
    const wsRef = useRef(null);
    const timerRef = useRef(null);
    //Context
    const {selectedLanguage} = useLanguage()

    useEffect(()=>{
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
        {
            return;
        }
        sendLanguage(selectedLanguage)
    },[selectedLanguage])

    useEffect(() => {
        let ws;
        let mounted = true;
        const connect = () => 
        {   
            if (!mounted) return;
            const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
            const ip = hostUri.split(":")[0]
            // console.log(ip);
            ws = new WebSocket(`ws://${ip}:8000/ws/mobile`)
            wsRef.current = ws
            ws.onopen = () =>
            {
                console.log("Websocket is connected");
                
            }
            ws.onmessage = (event) => {
                try
                {
                    const packet = JSON.parse(event.data)
                    const {type , ...data} = packet
                    if (type === 3)
                    {   
                        setVenueConfig(data)
                    }
                    else
                    {
                        setTelemetry({data});
                    }
                }
                catch (err)
                {
                    console.log("Recvieved Invalid Data",err);
                    
                }
                
            }

            ws.onclose = (error) => 
            {
                console.error("Websoket Closed :", error);
                if(!mounted)
                {
                    return
                }
                timerRef.current = setTimeout(connect, 2000);

            }
        }
        connect();
        return () => 
        {   mounted = false;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            ws?.close()
            wsRef.current = null
        }
    },[])

    const sendSos = useCallback((locationValue,currentCoords) =>
    {
        if (wsRef.current?.readyState === WebSocket.OPEN)
        {
            const payload = {
                type: PACKET.SOS,
                timestamp : new Date().toLocaleTimeString('en-US',{hour12:false}),
                user_id:Math.random().toString(36).substring(2, 8),
                x : locationValue?.px || null,
                y : locationValue?.py || null,
                lat: currentCoords?.latitude || null,
                lng : currentCoords?.longitude || null
            }
            wsRef.current.send(JSON.stringify(payload))
            return true;
        }
        return false;
    },[])

    const sendIncident = useCallback(async (audioURI,currentCoords) =>
    {
        if (wsRef.current?.readyState === WebSocket.OPEN)
        {
            let base64Audio = null;
            try
            {
                const file = new File(audioURI)
                base64Audio = await file.base64()
            }
            catch (err)
            {
                console.log("Failed to send audio",err);
                
            }        
            const payload = {
                id:Math.random().toString(36).substring(2, 8),
                type : PACKET.INCIDENT,
                audio: base64Audio,
                timestamp : new Date().toLocaleTimeString(),
                latitude : currentCoords?.latitude || null,
                longitude : currentCoords?.longitude || null

            }
            wsRef.current.send(JSON.stringify(payload))
            return true;
        }
        return false;
    },[])

    
    const sendLanguage = useCallback((language) =>
    {
        if (wsRef.current?.readyState === WebSocket.OPEN)
        {
            const payload = {
                type : PACKET.LANGUAGE,
                language
            }
            wsRef.current.send(JSON.stringify(payload))
            return true;
        }
        return false;
    },[])

    //Reduces UI Update CALLS
    const contextValue = useMemo(() => ({ telemetry, venueConfig, sendSos, sendIncident,sendLanguage }),[telemetry, venueConfig, sendSos, sendIncident]);

    return (
        <networkContext.Provider value={contextValue}>
            {children}
        </networkContext.Provider>
    )
}

export default NetworkContext
