import React from 'react'
import L, { latLng } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useState,useEffect,useRef } from 'react'
import CameraConfig from './CameraConfig'
import axios from 'axios'

//Icons
export const cameraIcon = L.icon(
    {
        iconUrl:"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1jY3R2LWljb24gbHVjaWRlLWNjdHYiPjxwYXRoIGQ9Ik0xNi43NSAxMmgzLjYzMmExIDEgMCAwIDEgLjg5NCAxLjQ0N2wtMi4wMzQgNC4wNjlhMSAxIDAgMCAxLTEuNzA4LjEzNGwtMi4xMjQtMi45NyIvPjxwYXRoIGQ9Ik0xNy4xMDYgOS4wNTNhMSAxIDAgMCAxIC40NDcgMS4zNDFsLTMuMTA2IDYuMjExYTEgMSAwIDAgMS0xLjM0Mi40NDdMMy42MSAxMi4zYTIuOTIgMi45MiAwIDAgMS0xLjMtMy45MUwzLjY5IDUuNmEyLjkyIDIuOTIgMCAwIDEgMy45Mi0xLjN6Ii8+PHBhdGggZD0iTTIgMTloMy43NmEyIDIgMCAwIDAgMS44LTEuMUw5IDE1Ii8+PHBhdGggZD0iTTIgMjF2LTQiLz48cGF0aCBkPSJNNyA5aC4wMSIvPjwvc3ZnPg==",
        iconSize:[30,30],
        iconAnchor: [15,15]
    }
)

export const gateIcon = L.icon(
    {
        iconUrl:"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1kb29yLW9wZW4taWNvbiBsdWNpZGUtZG9vci1vcGVuIj48cGF0aCBkPSJNMTEgMjBIMiIvPjxwYXRoIGQ9Ik0xMSA0LjU2MnYxNi4xNTdhMSAxIDAgMCAwIDEuMjQyLjk3TDE5IDIwVjUuNTYyYTIgMiAwIDAgMC0xLjUxNS0xLjk0bC00LTFBMiAyIDAgMCAwIDExIDQuNTYxeiIvPjxwYXRoIGQ9Ik0xMSA0SDhhMiAyIDAgMCAwLTIgMnYxNCIvPjxwYXRoIGQ9Ik0xNCAxMmguMDEiLz48cGF0aCBkPSJNMjIgMjBoLTMiLz48L3N2Zz4=",
        iconSize:[30,30],
        iconAnchor: [15,15]
    }
)

export const sosIcon = L.divIcon({
    className: 'sos-icon',
    html: `
        <div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-6 w-6 bg-red-600 border-2 border-white text-white font-black text-[9px] items-center justify-center shadow-lg shadow-red-950">
                SOS
            </span>
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
})

const VenueSetupModal = ({isOpen = true,onClose,onSaveConfiguration}) => {
    //States
    const [step,setStep] = useState("dimension")
    const [dimension,setDimension] = useState([200,200])
    const [camera,setCamera] = useState({})
    const [gates,setGates] = useState([])

    //Callibration States
    const [isCallibrating,setIsCallibrating] = useState(false)
    const [callibrationMode,setCallibrationMode] = useState("camera")
    const [cameraPoints,setCameraPoints] = useState([])
    const [mapPoints,setMapPoints] = useState([])

    // References
    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const mapMarkersRef = useRef({})
    const calibMarkersRef = useRef([])
    const isCallibratingRef = useRef(isCallibrating)
    const callibrationModeRef = useRef(callibrationMode)
    const mapPointsRef = useRef([])

    useEffect(() => 
    {
        if (!isOpen || step !== 'layout' || !mapContainerRef.current || mapInstanceRef.current)
        {
            return
        }

        const bounds = [[0,0],[dimension[0],dimension[1]]]

        const map = L.map(mapContainerRef.current,{
            crs:L.CRS.Simple,
            zoomControl: false,
            attributionControl : false
        })

        L.rectangle(bounds,{
            color: '#38bdf8',
            weight: 2,
            fillColor: '#0f172a',
            fillOpacity: 0.70,
        }).addTo(map)
        map.fitBounds(bounds)

        const onMapClick = (e) => {
            if (!isCallibratingRef.current || callibrationModeRef.current != 'map' || mapPoints.length >= 4)
            {
                return
            }
            const currentPoints = mapPointsRef.current
            const {lat,lng} = e.latlng
            const pointX = +lng.toFixed(1)
            const pointY = +lat.toFixed(1)
            const pointNumber = currentPoints.length + 1
            const marker = L.circleMarker([pointY, pointX], 
            {
                radius: 7,
                color: '#06b6d4',
                fillColor: '#22d3ee',
                fillOpacity: 0.9,
            }).addTo(map)

            marker.bindTooltip(`M${pointNumber}`, { permanent: true, direction: 'top' })
            calibMarkersRef.current.push(marker)
            const newPoints = [...currentPoints,[pointX, pointY]]
            mapPointsRef.current = newPoints
            setMapPoints(newPoints)
        }
        map.on("click",onMapClick);

        mapInstanceRef.current = map

        return () => {
            if (mapInstanceRef.current)
            {
                mapInstanceRef.current.off('click', onMapClick)
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }

    },[isOpen,step,dimension])

    useEffect(() => 
    {
        if (mapInstanceRef.current) 
        {
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize()
            }, 500)
        }
    }, [isCallibrating,dimension])

    useEffect(() => 
    {
        isCallibratingRef.current = isCallibrating
    },[isCallibrating])

    useEffect(() => 
    {
        callibrationModeRef.current = callibrationMode
    },[callibrationMode])

    useEffect(() => 
    {
        mapPointsRef.current = mapPoints
    }, [mapPoints])

    const saveCalibrations = () => 
    {
        if (cameraPoints.length !== 4 || mapPoints.length !== 4) 
        {
            alert("Select 4 points on both cctv image and venue.")
            return
        }

        if (mapInstanceRef.current) 
        {
            calibMarkersRef.current.forEach(marker => 
            {
                mapInstanceRef.current.removeLayer(marker)
            })
        }

        setCamera(prev => ({
            ...prev,
            callibration: 
            {
                camera_points : cameraPoints,
                venue_points : mapPoints
            }
        }))
        console.log(mapPoints,cameraPoints)
        calibMarkersRef.current = []
        setIsCallibrating(false)
    }

    const resetCalibrations = () => 
    {
        if (mapInstanceRef.current) 
        {
            calibMarkersRef.current.forEach(marker => 
            {
                mapInstanceRef.current.removeLayer(marker)
            })
        }

        calibMarkersRef.current = []
        mapPointsRef.current = []
        setMapPoints([])
        setCameraPoints([])
        setCallibrationMode('camera')
    }

    const addCamera = () => 
    {
        const map = mapInstanceRef.current
        if (!map)
        {
            return
        }

        const cameraID = 'cam_0'
        const cameraName = 'CAM-01'
        const defaultPos = [dimension[0] / 2,dimension[1]/2]

        const marker = L.marker(defaultPos,{
            draggable: true,
            icon:cameraIcon
        }).addTo(map)
        
        marker.bindTooltip(cameraName,{permanent:false,direction:'top'})
        const newCamera = {id : cameraID,name : cameraName,x : defaultPos[0], y:defaultPos[1],direction:"FORWARD"}

        marker.on('dragend',(e) => {
            const {lat,lng} = e.target.getLatLng()
            setCamera(prev => ({...prev,x:+lng.toFixed(2),y:+lat.toFixed(2)}))
        })
        
        mapMarkersRef.current[cameraID] = newCamera
        setCamera(newCamera)
        setCameraPoints([])
        setMapPoints([])
        setCallibrationMode('camera')
        setIsCallibrating(true)

    }

    const addGates = () => 
    {
        const map = mapInstanceRef.current
        if (!map)
        {
            return
        }
        
        const gate_letter = String.fromCharCode(65 + gates.length)
        const gateID = `gate_${gate_letter.toLowerCase()}`
        const gateName = `Gate ${gate_letter}`
        const defaultPos = [dimension[0]/2,dimension[1]/4]

        const marker = L.marker(defaultPos,{
            draggable:true,
            icon:gateIcon
        }).addTo(map)
        marker.bindTooltip(gateName,{permanent:false,direction:'bottom'})

        const newGate = {id:gateID,name:gateName,x : defaultPos[0],y:defaultPos[1]}

        marker.on('dragend',(e) => {
            const {lat,lng} = e.target.getLatLng()
            setGates(prev => prev.map((g) => (g.id === gateID ? {...g,x:+lng.toFixed(2),y:+lat.toFixed(2)} : g)))
        })

        mapMarkersRef.current[gateID] = newGate
        setGates((prev) => ([...prev,newGate]))


    }

    const completeSetup = async () =>
    {
        const payload = {
            dimensions: dimension,
            camera,
            gates
        }

        try
        {
            await axios.post('http://localhost:8000/api/v1/venue/config',payload)

        }   
        catch
        {
            alert("Failed to finish venue setup")
        }

        if(onSaveConfiguration)
        {
            onSaveConfiguration(payload)
        }
        if (onClose)
        {
            onClose()
        }
    }

    if (!isOpen)
    {
        return null
    } 

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] max-h-[750px] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                        <h2 className="text-base font-black tracking-wider text-white uppercase">Command Center Initial Setup Wizard</h2>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
                        {step === 'dimension' ? 'STEP 1 / 2' : 'STEP 2 / 2'}
                    </span>
                </div>
                {/* Modal Content Bosdy */}
                <div className="flex-1 p-6 flex flex-col overflow-hidden bg-slate-950/50">
                {step === 'dimension' ? (
                    //Step-1
                    <div className="m-auto w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-5 shadow-xl">
                        <div>
                            <h3 className="text-lg font-bold text-white">Define Venue Boundaries</h3>
                            <p className="text-xs text-slate-400 mt-1">Enter the total physical grid dimensions (meters or scale pixels) for your floorplan.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                            <label className="text-xs text-slate-400 block mb-1 font-mono uppercase">Breadth (X Axis)</label>
                            <input type="number" value={dimension[0]} onChange={(e) => setDimension([Number(e.target.value),dimension[1]])}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white font-mono focus:border-cyan-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            </div>
                            <div>
                            <label className="text-xs text-slate-400 block mb-1 font-mono uppercase">Length (Y Axis)</label>
                            <input type="number" value={dimension[1]} onChange={(e) => setDimension([dimension[0],Number(e.target.value)])}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white font-mono focus:border-cyan-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            </div>
                        </div>
                        <button onClick={() => setStep('layout')} className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-950">
                            Proceed to Spatial Drag & Drop
                        </button>
                    </div>
                ) : (
                    //Step-2
                    <div className="flex-1 flex flex-col gap-4 h-full">
                        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl">
                            <p className="text-xs text-slate-400 font-mono">Venue Size: <span className="text-white font-bold">{dimension[0]}m x {dimension[1]}m</span></p>
                            <div className="flex items-center gap-3">
                                <button disabled={Object.keys(camera).length} onClick={addCamera} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer">
                                    Add Camera
                                </button>
                                {/* Expected Crowd Direction Selection */}
                                {(camera.id && isCallibrating) && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 font-mono">Expected Crowd Flow:</span>
                                        <select
                                            value={camera.direction}
                                            onChange={(e) =>
                                                setCamera(prev => ({
                                                    ...prev,
                                                    direction: e.target.value
                                                }))
                                            }
                                            className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg border border-slate-700"
                                        >
                                            <option value="FORWARD">Forward</option>
                                            <option value="BACKWARD">Backward</option>
                                            <option value="LEFT">Left</option>
                                            <option value="RIGHT">Right</option>
                                        </select>
                                    </div>
                                )}
                                <button onClick={addGates} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer">
                                    Add Gate
                                </button>
                                <button
                                    onClick={completeSetup}
                                    disabled={!camera || gates.length === 0 || mapPoints.length == 0 || cameraPoints.length == 0 || isCallibrating}
                                    className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                                    camera && gates.length > 0
                                        ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-950'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    Lock Map & Start Live Monitoring
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[350px] flex">
                            {/* Camera Callibration */}
                            {isCallibrating && (
                            <div className="w-1/2 h-full relative">
                                <CameraConfig
                                    callibrationMode={callibrationMode}
                                    setCallibrationMode={setCallibrationMode}
                                    cameraPoints={cameraPoints}
                                    setCameraPoints={setCameraPoints}
                                    mapPoints={mapPoints}
                                    setMapPoints={setMapPoints}
                                    saveCallibrations={saveCalibrations}
                                    resetCallibrations={resetCalibrations}
                                />
                            </div>
                            )}
                            {/* Map Container */}
                            <div className={`h-full transition-all duration-200 relative ${isCallibrating ? 'w-1/2' : 'w-full'}`}>
                                <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" style={{ background: '#020617' }}/>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    )
}

export default VenueSetupModal
