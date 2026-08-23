import React from 'react'
import LiveClock from './LiveClock'
import AnalysisChart from './AnalysisChart'
import VenueMap from './VenueMap'
import IncidentFeed from './IncidentFeed'
import { useTelemetryContext,useIncidentContext } from '../context/TelemetryContext'
import { useContext } from 'react'
 

const ANOMALY_FLAGS = [
    {key:'reverse_flow',label:'Reverse Flow',level:'warning'},
    {key:'sudden_surge',label:'Sudden Surge',level:'warning'},
    {key:'panic_onset',label:'Panic Onset',level:'critical'},
    {key:'panic_propagation',label:'Panic Wave',level:'critical'},
    {key:'rapid_dispersal',label:'Rapid Dispersal',level:'warning'},
]

const CRUSH_MIN_STYLE = {
        SAFE : 'text-emerald-400',
        DANGER: 'text-red-400',
        WARNING : 'text-amber-400'
    }

const Content = () => {
    //Contexts
    const telemetry = useTelemetryContext()
    const {incidents,setIncidents} = useIncidentContext()

    const head_count = telemetry?.data?.crowd_monitoring?.person_count || 0
    const net_flow_rate = telemetry?.data?.crowd_monitoring?.net_flow_rate || 0
    var crush_mins = telemetry?.data?.risk_prediction?.crush_mins
    const motion_speed = telemetry?.data?.crowd_monitoring?.motion_speed || 0
    const motion_variance = telemetry?.data?.crowd_monitoring?.motion_variance || 0
    const flow_direction = telemetry?.data?.crowd_monitoring?.flow_direction || "STATIONARY"

    const anomalies = telemetry?.data?.anomalies || {}
    const active_anomalies = Object.keys(anomalies).filter((k) => !!anomalies[k])
    const anomaly_count = active_anomalies.length
    const no_anomaly = anomaly_count === 0

    const gate_actions = telemetry?.data?.recommendations?.gate_controls || []
    const security_staff = telemetry?.data?.recommendations?.security_staff || 0
    
    if (crush_mins === null)
    {
        crush_mins = "SAFE"
    }
    else if(crush_mins === 0.0)
    {
        crush_mins = "DANGER"
    }    

    return (
        <div className='flex-1 grid grid-cols-12 p-3 gap-3'>
        <section className='flex flex-col gap-3 col-span-7 h-full'>
            <div className='flex flex-col flex-1 relative p-2 bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg text-gray-400 text-xs'>
                <div className='flex justify-between'>
                    <div className='flex gap-2 items-center text-gray-400 text-xs mb-2'>
                        <span className='w-2 h-2 bg-red-600 rounded-full'/>
                        <span>CAMERA 01: LIVE FEED</span>
                    </div>
                    <LiveClock/>
                </div>
                <div className='flex-1 flex relative bg-black border border-gray-800 rounded-lg overflow-hidden items-center justify-center'>
                    <img className='w-full h-full object-contain' src="http://localhost:8000/api/v1/stream/cam1" alt="CCTV Stream Unreachable"/>
                </div>
            </div>
            <div className='flex flex-col p-2 bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg text-gray-400 text-xs'>
                <span>CROWD & RISK ANALYTICS TREND</span>
                <div className='flex flex-1 relative'>
                    <AnalysisChart/>
                </div>
            </div>
        </section>
        <section className='flex flex-col col-span-5 gap-3'>
            <div className='flex flex-col gap-3 p-2 h-[280px] bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg text-gray-400 text-xs'>
                <div className='flex justify-between items-center'>
                    <span className='tracking-wider'>LIVE VENUE MAP</span>
                    <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-700">ZONE-A CRITICAL</span>
                </div>
                <VenueMap/>
            </div>
            <div className='flex flex-1 flex-col gap-3 p-2 bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg text-gray-400 text-xs'>
                <span>Flow Analytics</span>
                <div className='flex gap-2 justify-between'>
                    <div className='flex flex-col p-1.5 gap-1.5 flex-1 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                        <span>Headcount</span>
                        <h2 className='text-sm text-white font-bold'>{head_count}</h2>
                    </div>
                    <div className='flex flex-col p-1.5 gap-1.5 flex-1 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                        <span>Net Flow Rate</span>
                        <h2 className='text-sm text-blue-400 font-bold'>{net_flow_rate} p/s</h2>
                    </div>
                    <div className='flex flex-col p-1.5 gap-1.5 flex-1 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                        <span>Est. Time To Crush</span>
                        <h2 className={`text-sm ${CRUSH_MIN_STYLE[crush_mins] || CRUSH_MIN_STYLE.WARNING} font-bold uppercase`}>{crush_mins}</h2>
                    </div>
                </div>
                <div className='flex gap-2 justify-between'>
                    <div className='flex flex-col p-1.5 gap-1.5 flex-1 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                        <span>Motion Speed</span>
                        <h2 className='text-sm text-white font-bold'>{motion_speed} m/s</h2>
                    </div>
                    <div className='flex flex-col p-1.5 gap-1.5 flex-1 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                        <span>Motion Variance</span>
                        <h2 className='text-sm text-blue-400 font-bold'>{motion_variance} m/s<sup>2</sup></h2>
                    </div>
                    <div className='flex flex-col p-1.5 gap-1.5 flex-1 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                        <span>Flow Direction</span>
                        <h2 className='text-sm text-white font-bold uppercase'>{flow_direction}</h2>
                    </div>
                </div>
                <IncidentFeed/>
                <div className='flex flex-col gap-2 p-2 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                    <div className="flex items-center justify-between">
                        <span>Anomalies:</span>
                        {
                            no_anomaly ? (
                                <span className="text-xs font-semibold tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/50">
                                    NOT FOUND
                                </span>
                            )
                            :
                            (
                                <span className="text-xs font-semibold tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-600/50 animate-pulse">
                                    {anomaly_count} {anomaly_count === 1 ? 'ANOMALY' : 'ANOMALIES'} DETECTED
                                </span>
                            )
                        }
                        
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {ANOMALY_FLAGS.map((flag) => {
                            const isActive = !!anomalies[flag.key]
                            const isCritical = flag.level === 'critical'

                            return (
                                <div
                                    key={flag.key}
                                    className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all select-none ${
                                        isActive
                                        ? isCritical
                                            ?'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-950/50 animate-pulse'
                                            :'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md shadow-amber-950/50 animate-pulse'
                                        :'bg-slate-900/60 border-slate-800/60 text-slate-500 opacity-60'
                                    }`}
                                    >
                                    <span className="truncate">{flag.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className='flex flex-col gap-2 p-2 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                    <span>Gate Actions:</span>
                    <div className='flex flex-col gap-3 overflow-auto'>
                        {
                            gate_actions.map((gate) => (
                                <div className='flex justify-between text-gray-300' key={gate.gate.id}>
                                    <span>{gate.gate.name}</span>
                                    <span className='text-emerald-400 font-semibold uppercase'>{gate.action}</span>
                                </div>
                            ))
                        }
                    </div>
                </div>
                <div className='flex flex-col gap-2 p-2 text-gray-400 text-xs bg-[#0b0f19] backdrop-blur-md border-2 border-[#1A2330] rounded-lg'>
                    <span>Required Security Deployments:</span>
                    <div className='flex justify-between text-gray-200'>
                        <span>Ground Stewards Needed:</span>
                        <span className='text-amber-400 font-semibold uppercase'>{security_staff} Officers</span>
                    </div>
                </div>
            </div>
        </section>
        </div>
    )
}

export default Content
