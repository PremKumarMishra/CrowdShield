import React from 'react'
import { useContext } from 'react'
import StatusBadge from './StatusBadge'
import {useTelemetryContext} from '../context/TelemetryContext'

const HeaderInformation = () => {
    const telemetry = useTelemetryContext()
    const status =  telemetry.connected ? "CONNECTED" : telemetry.connected === false ? "DISCONNECTED" : "CONNECTING"
    const connection_style = {
        CONNECTED : 'text-emerald-500',
        DISCONNECTED : 'text-red-500'
    }

    return (
        <div className='flex justify-between gap-5'>
        <div className='flex flex-col justify-center text-gray-400 text-xs uppercase'>
            <h3>connection status</h3>
            <h3 className={`${connection_style[status] || connection_style.DISCONNECTED}`}>{status}</h3>
        </div>
        <div className='flex flex-col justify-center text-gray-400 text-xs uppercase'>
            <h3>primary monitoring zone</h3>
            <h3 className='text-white'>Gate A North Corridor</h3>
        </div>
        <StatusBadge/>
        </div>
    )
}

export default HeaderInformation
