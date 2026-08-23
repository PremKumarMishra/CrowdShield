import React, { useRef, useEffect } from 'react'

const CameraConfig = ({
    callibrationMode,
    setCallibrationMode,
    cameraPoints,
    setCameraPoints,
    mapPoints,
    setMapPoints,
    saveCallibrations,
    resetCallibrations,
    streamUrl = "http://localhost:8000/api/v1/stream/cam1/frame"
    }) => {
    
    const imageFrameRef = useRef(null)
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) 
        {
            return
        }
        const ctx = canvas.getContext('2d')

        const width = canvas.width
        const height = canvas.height

        ctx.clearRect(0, 0, width, height)

        if (cameraPoints.length === 0)
        {
            return
        }   

        if (cameraPoints.length > 1)
        {
            ctx.beginPath()
            ctx.moveTo(cameraPoints[0][0] * width, cameraPoints[0][1] * height)

            for (let i = 1; i < cameraPoints.length; i++) 
            {
                ctx.lineTo(cameraPoints[i][0] * width, cameraPoints[i][1] * height)
            }

            if (cameraPoints.length === 4) 
            {
                ctx.closePath()
                ctx.fillStyle = 'rgba(34, 211, 238, 0.25)'
                ctx.fill()
            }

            ctx.strokeStyle = '#22d3ee'
            ctx.lineWidth = 4
            ctx.setLineDash([8, 8])
            ctx.stroke()
            ctx.setLineDash([]) 
        }

        cameraPoints.forEach(([nx, ny], idx) => {
        const x = nx * width
        const y = ny * height

        ctx.beginPath()
        ctx.arc(x, y, 22, 0, 2 * Math.PI)
        ctx.fillStyle = '#22d3ee'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(x, y, 16, 0, 2 * Math.PI)
        ctx.fillStyle = '#0f172a'
        ctx.fill()

        ctx.fillStyle = '#22d3ee'
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`P${idx + 1}`, x, y)
        })
    }, [cameraPoints])

    const handleCCTVClick = (e) => {
        if (cameraPoints.length >= 4) 
        {
            return
        }
        const rect = e.currentTarget.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width
        const relY = (e.clientY - rect.top) / rect.height

        const pointX = Number(relX.toFixed(6))
        const pointY = Number(relY.toFixed(6))

        const updated = [...cameraPoints, [pointX, pointY]]
        setCameraPoints(updated)

        if (updated.length === 4) 
        {
            setCallibrationMode('map')
        }
    }

    return (
        <div className="w-full h-full bg-slate-950/95 p-4 rounded-xl flex flex-col gap-4 animate-fade-in border border-cyan-800/40 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                    <p className="text-xs text-slate-400">
                        {callibrationMode === 'camera'
                        ? `Step 1: Select ground points on frame (${cameraPoints.length}/4 points)`
                        : `Step 2: Select ground points on venue (${mapPoints.length}/4 points)`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={resetCallibrations} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded font-mono transition-all cursor-pointer">
                        Reset
                    </button>
                    <button onClick={saveCallibrations} disabled={cameraPoints.length !== 4 || mapPoints.length !== 4} className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-950">
                        Save
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex justify-between">
                        <span>1. CCTV Feed (1920x1080)</span>
                        <span className="text-slate-500">{cameraPoints.length}/4 Points</span>
                    </span>
                    <div ref={imageFrameRef} onClick={handleCCTVClick} className="relative w-full aspect-video  bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg overflow-hidden cursor-crosshair select-none flex items-center justify-center group">
                        <img src={streamUrl} alt="CCTV Live Stream" className="w-full h-full object-contain pointer-events-none" onError={(e) => {e.target.style.display = 'none'}}/>
                        <canvas ref={canvasRef} width={640} height={360} className="absolute inset-0 w-full h-full pointer-events-none z-10"/>
                        <div className="absolute text-center text-slate-600 pointer-events-none">
                            <p className="text-xs font-mono uppercase">Click 4 corners of floor/corridor zone</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CameraConfig