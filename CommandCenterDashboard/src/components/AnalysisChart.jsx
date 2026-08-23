import React from 'react'
import { useRef,useContext,useEffect } from 'react'
import { useTelemetryContext } from '../context/TelemetryContext'
import {Chart} from 'chart.js/auto'

const AnalysisChart = () => {
    const telemetry = useTelemetryContext()
    const timestamp = new Date().toLocaleTimeString('en-US',{hour12:false})
    const head_count = telemetry?.data?.crowd_monitoring?.person_count || 0
    const risk_score = telemetry?.data?.risk_prediction?.risk_score || 0

    const canvasRef = useRef(null)
    const chartRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if(!canvas)
        {
            return
        }
        const ctx = canvas.getContext("2d")
        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Headcount',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Risk Score',
                        data: [],
                        borderColor: '#ef4444',
                        borderDash: [1, 1],
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#64748b', fontSize: 10 }, grid: { display: false } },
                    y: { position: 'left', ticks: { color: '#3b82f6' }, grid: { color: '#1e293b' } },
                    y1: { position: 'right', min: 0, max: 1.0, ticks: { color: '#ef4444' }, grid: { display: false } }
                },
                plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12 } } }
            }
        });

        return () => 
        {
            if(chartRef.current)
            {
                chartRef.current.destroy()
                chartRef.current = null
            }
        }
    },[])

    useEffect(() => {
       const trendChart = chartRef.current
       if(!trendChart)
       {
            return
       }

        if (trendChart.data.labels.length > 20) {
            trendChart.data.labels.shift();
            trendChart.data.datasets[0].data.shift();
            trendChart.data.datasets[1].data.shift();
        }
        trendChart.data.labels.push(timestamp);
        trendChart.data.datasets[0].data.push(head_count);
        trendChart.data.datasets[1].data.push(risk_score);
        trendChart.update('none');

    },[telemetry])
    return (
        <canvas ref={canvasRef}>
        </canvas>
    )
}

export default AnalysisChart
