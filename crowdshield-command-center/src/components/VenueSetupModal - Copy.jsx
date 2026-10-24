import React from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useState,useEffect,useRef } from 'react'
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

const VenueSetupModal = ({isOpen = true,onClose,onSaveConfiguration}) => {
    //States
    const [step,setStep] = useState("dimension")
    const [dimension,setDimension] = useState([200,200])
    const [camera,setCamera] = useState({})
    const [gates,setGates] = useState([])

    // References
    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const mapMarkersRef = useRef({})

    useEffect(() => {
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

        mapInstanceRef.current = map

        return () => {
            if (mapInstanceRef.current)
            {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }

    },[isOpen,step,dimension])


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
        const newCamera = {id : cameraID,name : cameraName,angle : 90,x : defaultPos[0], y:defaultPos[1]}

        marker.on('dragend',(e) => {
            const {lat,lng} = e.target.getLatLng()
            setCamera(prev => ({...prev,x:+lng.toFixed(2),y:+lat.toFixed(2)}))
        })

        mapMarkersRef.current[cameraID] = newCamera
        setCamera(newCamera)

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
        /* Modal Backdrop Overlay */
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            {/* Modal Container Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] max-h-[750px] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                    <h2 className="text-base font-black tracking-wider text-white uppercase">
                    Command Center Initial Setup Wizard
                    </h2>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
                    {step === 'dimension' ? 'STEP 1 / 2' : 'STEP 2 / 2'}
                </span>
                </div>

                {/* Modal Content Body */}
                <div className="flex-1 p-6 flex flex-col overflow-hidden bg-slate-950/50">
                {step === 'dimension' ? (
                    /* STEP 1: DIMENSIONS FORM */
                    <div className="m-auto w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-5 shadow-xl">
                        <div>
                            <h3 className="text-lg font-bold text-white">Define Venue Boundaries</h3>
                            <p className="text-xs text-slate-400 mt-1">
                            Enter the total physical grid dimensions (meters or scale pixels) for your floorplan.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                            <label className="text-xs text-slate-400 block mb-1 font-mono uppercase">
                                Width (X Axis)
                            </label>
                            <input
                                type="number"
                                value={dimension[0]}
                                onChange={(e) => setDimension([Number(e.target.value),dimension[1]])}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white font-mono focus:border-cyan-500 outline-none"
                            />
                            </div>
                            <div>
                            <label className="text-xs text-slate-400 block mb-1 font-mono uppercase">
                                Height (Y Axis)
                            </label>
                            <input
                                type="number"
                                value={dimension[1]}
                                onChange={(e) => setDimension([dimension[0],Number(e.target.value)])}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white font-mono focus:border-cyan-500 outline-none"
                            />
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('layout')}
                            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-950"
                        >
                            Proceed to Spatial Drag & Drop →
                        </button>
                    </div>
                ) : (
                    /* STEP 2: INTERACTIVE DRAG & DROP MAP */
                    <div className="flex-1 flex flex-col gap-4 h-full">
                        {/* Controls Bar */}
                        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl">
                            <p className="text-xs text-slate-400 font-mono">
                            Venue Size: <span className="text-white font-bold">{dimension[0]}m x {dimension[1]}m</span>
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={addCamera}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    + 📷 Add CCTV
                                </button>
                                <button
                                    onClick={addGates}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    + 🚪 Add Gate
                                </button>
                                <button
                                    onClick={completeSetup}
                                    disabled={!camera.id || gates.length === 0}
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

                        {/* Leaflet CRS.Simple Modal Canvas */}
                        <div className="flex-1 relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[350px]">
                            <div ref={mapContainerRef} className="w-full h-full z-0" />
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    )
}

export default VenueSetupModal
