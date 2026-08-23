import {G,Path} from 'react-native-svg'
const GateIcon = ({ x, y,size=30 ,color = "#38BDF8" }) => {
    const scale = size / 24
    return (
    <G transform={`translate(${x - size/2}, ${y - size/2}) scale(${scale})`}>
        <Path
            d="M10 12h.01"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M2 20h20"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </G>
    )
}

export default GateIcon