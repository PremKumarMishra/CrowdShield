import React, { useState } from 'react'
import {useContext,useEffect,useRef} from 'react'
import {venueContext} from '../components/Page'
import { useTelemetryContext,useSosContext } from '../context/TelemetryContext'
import {gateIcon,cameraIcon,sosIcon} from '../components/VenueSetupModal'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const heat_gradient = {
    0.2: '#007FFF', 
    0.5: '#eab308', 
    0.8: '#f97316', 
    1.0: '#ef4444' 
}

function lerpColor(color1,color2,factor)
{
    const c1 = parseInt(color1.replace("#",""),16)
    const c2 = parseInt(color2.replace("#",""),16)

    const r1 = (c1 >> 16) & 255
    const g1 = (c1 >> 8) & 255
    const b1 = c1 & 255

    const r2 = (c2 >> 16) & 255
    const g2 = (c2 >> 8) & 255
    const b2 = c2 & 255

    const r = Math.round(r1 + factor * (r2-r1))
    const g = Math.round(g1 + factor * (g2-g1))
    const b = Math.round(b1 + factor * (b2-b1))

    const color = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    return color;

}

const VenueMap = () => {
    const venue = useContext(venueContext)
    const telemetry = useTelemetryContext()
    const sos = useSosContext()

    const [heatMarkers,setHeatMarkers] = useState([])
    const [sosMarkers, setSosMarkers] = useState([])
    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    
    useEffect(() => {
        const mapContainer = mapContainerRef.current
        const mapInstance = mapInstanceRef.current
        if(!mapContainer || !venue)
        {
            return
        }
        
        const bounds = [[0,0],venue.dimensions]
        const x = [1,2]
        const map = L.map(mapContainer,{
            crs: L.CRS.Simple,
            zoomControl: false,
            attributionControl: false
        })
        console.log(bounds,venue);
        
        L.rectangle(bounds,{
                    color: '#38bdf8',
                    weight: 2,
                    fillColor: '#1e293b',
                    fillOpacity: 0.70,
        }).addTo(map)
        map.fitBounds(bounds)

        const marker = L.marker([venue.camera.y,venue.camera.x],{icon:cameraIcon}).addTo(map)
        marker.bindTooltip(venue.camera.name,{permanent:false,direction:'top'})
        
        venue.gates.forEach((element) => {
            const marker = L.marker([element.y,element.x],{icon:gateIcon}).addTo(map)
            marker.bindTooltip(element.name,{permanent:false,direction:'bottom'})
        })
        
        mapInstanceRef.current = map

        return () => {
            if (mapInstanceRef.current)
            {
                map.remove()
                mapInstanceRef.current = null
            }
        }
    },[venue])

    useEffect(() => 
    {
        const map = mapInstanceRef.current
        if (!map)
        {
            return
        }

        heatMarkers.forEach((hm) => mapInstanceRef.current.removeLayer(hm))
        setHeatMarkers([])

        telemetry?.data?.heat_boxes.forEach((pt) => {
            var color = heat_gradient[0.2]
            if (pt.density <= 0.2)
            {
                color = heat_gradient[0.2]
            }
            else if (pt.density > 0.2 && pt.density <=0.5)
            {
                color = lerpColor(heat_gradient[0.2],heat_gradient[0.5],pt.density)
            }
            else if (pt.density > 0.5 && pt.density <= 0.8)
            {
                color = lerpColor(heat_gradient[0.5],heat_gradient[0.8],pt.density)
            }
            else
            {
                color = lerpColor(heat_gradient[0.8],heat_gradient[1.0],pt.density)
            }
            const heat_marker = L.circleMarker([pt.y,pt.x],{
                radius: 5,
                color: color,
                fillColor: color,
                fillOpacity: 1.0,
                weight:0

            }).addTo(map)

            setHeatMarkers((prev) => ([...prev,heat_marker]))
        })

    },[telemetry])

    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map)
        {
            return
        }
        sosMarkers.forEach((sm) => map.removeLayer(sm))

        //Sos Rendering
        console.log(sos);
        sos.forEach((pt) => {
            console.log(pt);
            
            const marker = L.marker([pt.y, pt.x], { icon: sosIcon }).addTo(map)
            marker.bindPopup(`
                <div class="p-1 min-w-[140px] text-slate-900 font-sans">
                    <div class="flex items-center gap-1 text-red-600 font-bold text-xs uppercase mb-1">
                        Emergency SOS
                    </div>
                    <div class="text-xs font-semibold text-slate-800">User: ${pt.user_id || 'Anonymous'}</div>
                    <div class="text-[10px] text-slate-500 mb-2">Time: ${pt.timestamp || 'Just now'}</div>
                    <button 
                        onclick="alert('Dispatching security unit to SOS coordinate (${pt.lat}, ${pt.lng})')"
                        class="w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1 px-2 rounded shadow cursor-pointer transition-colors"
                    >
                        Dispatch Guard
                    </button>
                </div>
            `)
            sosMarkers.push(marker)
        })
    },[sos])

    return (
        <div className="flex-1 w-full relative rounded-lg overflow-hidden bg-[#020617]">
            <div ref={mapContainerRef} className='flex-1 w-full h-full relative overflow-hidden rounded-lg' style={{ background: '#020617' }}>
            </div>
        </div>
    )
}

export default VenueMap
