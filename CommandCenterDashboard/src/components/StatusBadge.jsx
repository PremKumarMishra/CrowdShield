import React from 'react'
import { useTelemetryContext } from '../context/TelemetryContext'
import { useContext } from 'react'

const StatusBadge = () => 
{
    const telemetry = useTelemetryContext()
    const status = telemetry?.data?.risk_prediction?.status || 'GREEN'
    const style = {
        GREEN :  'bg-emerald-950 text-emerald-400 border border-emerald-500',
        YELLOW : 'bg-amber-950 text-amber-400 border border-amber-500',
        RED : 'bg-red-950 text-red-400 border border-red-500'
    }
    return (
        <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest ${style[status] || style.GREEN}`}>
            STATUS: {status.toUpperCase()}
        </span>
    )
}

export default StatusBadge
