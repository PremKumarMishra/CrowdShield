import React, { useEffect, useState } from 'react'

const LiveClock = () => {
    const [time,setTime] = useState(new Date().toLocaleTimeString('en-US',{hour12:false}))
    useEffect(() => {
        setInterval(() => {
            var now = new Date()
            setTime(now.toLocaleTimeString('en-US',{hour12:false}))
        }, 1000);
    },[])
    return (
        <span className='text-gray-400 text-xs'>TIME: {time}</span>
    )
}

export default LiveClock
