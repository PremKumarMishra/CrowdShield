import React from 'react'
import {useIncidentContext} from '../context/TelemetryContext'


const getIncidentDescription = (report) => {
    const lat = report.latitude ?? 'Unknown';
    const lng = report.longitude ?? 'Unknown';
    switch (report.category) {
        case 'CONGESTION':
            return `Crowd congestion reported at lat: ${lat}, lng: ${lng}`;
        case 'STAMPEDE_RISK':
            return `Stampede risk reported at lat: ${lat}, lng: ${lng}`;
        case 'SECURITY_THREAT':
            return `Security threat at lat: ${lat}, lng: ${lng}`;
        case 'STAMPEDE_RISK':
            return `Stampede risk reported at lat: ${lat}, lng: ${lng}`;
        case 'FIRE_EXPLOSION':
            return `Fire incident reported at lat: ${lat}, lng: ${lng}`;
        case 'STRUCTURAL_COLLAPSE':
            return `Structure collpase reported at lat: ${lat}, lng: ${lng}`;
        case 'MEDICAL_EMERGENCY':
            return `Medical emergency reported at lat: ${lat}, lng: ${lng}`;
        default:
            return `Incident reported at lat: ${lat}, lng: ${lng}`;
    }
};

const IncidentFeed = () => {
    const {incidents,setIncidents} = useIncidentContext()

    const onResolveIncident = (id) =>
    {
        setIncidents((prev) => prev.filter((item) => item.id !== id))
    }

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Live Incident Feed</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {incidents.length} Active
                </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {incidents.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">No active reports</div>
                ) : (
                    incidents.map((report,idx) => (
                        <div  key={report.id} className={`p-2.5 rounded border text-xs transition-all ${
                                report.type === 'CRITICAL' 
                                    ? 'bg-red-950/30 border-red-800/60 hover:border-red-600' 
                                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-500'
                            }`}>
                            <div className="flex items-start justify-between gap-2">
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${report.type === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                    {report.category || 'REPORT'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {report.timestamp || 'Just now'}
                                </span>
                            </div>

                            <p className="text-slate-200 font-medium mt-1.5 text-[11px] leading-snug">
                                {getIncidentDescription(report)}
                            </p>
                            <p className="mt-1 text-[10px] font-mono text-amber-300/90 italic bg-slate-900/80 px-2 py-1 rounded border border-slate-800/80 truncate">
                                <span className="not-italic text-slate-500 font-bold uppercase mr-1">Voice:</span>
                                "{report.transcript}"
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                                <span>{report.locationName || 'Zone A'}</span>
                                <button onClick={() => onResolveIncident && onResolveIncident(report.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-700 transition-colors">
                                    Resolve
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
export default IncidentFeed