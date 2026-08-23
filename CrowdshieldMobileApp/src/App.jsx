import {StatusBar} from 'expo-status-bar';
import {StyleSheet,Text,View,Alert,ScrollView,TouchableOpacity, Vibration} from 'react-native';
import {SafeAreaView,SafeAreaProvider} from 'react-native-safe-area-context'
import Svg, {Circle,Line,Polyline,Polygon,Rect,Text as SvgText,G,} from 'react-native-svg';
import * as Location from 'expo-location'
import { useEffect,useState,useContext, useRef} from 'react';
import { Feather } from '@expo/vector-icons'
import {styles} from './Theme';
import GateIcon from './components/GateIcon';
import ReportButton from './components/ReportButton';
import LanguageModal from './components/LanguageModal'
import {useNetworkActions,useTelemetry,useVenueConfig} from './context/NetworkContext'
import { useLanguage } from './context/LanguageContext';
import {useDeadReckoning} from './hooks/useDeadReckoning'
import {findSafePath,getSafestGate} from './Pathfind'
import { useVibration } from './hooks/useVibration';

const heat_gradient = {
    0.2: '#007FFF', 
    0.5: '#eab308', 
    0.8: '#f97316', 
    1.0: '#ef4444' 
}

const risk_status = 
{
    GREEN : {
        label : "NORMAL",
        text : "Venue conditions are currently normal.",
        badge_style : '#14532d',
        text_style : '#4ade80',
        border_style : '#14532d',
        warn_symbol : '✓',

    },
    YELLOW : {
        label : "CRITICAL",
        text : "Venue conditions are currently critical.",
        badge_style : '#451a03',
        text_style : '#FBBF24',
        border_style : '#854d0e',
        warn_symbol : '⚠',
    },
    RED : {
        label : "DANGER",
        text : "Venue conditions are currently dangerous.",
        badge_style : '#450A0A',
        text_style : '#ff6467',
        border_style : '#7f1d1d',
        warn_symbol : '✕'
    }
}

const lerpColor = (color1,color2,factor) =>
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


export default function App() {
    //States
    const [mContainerDim,setmContainerDim] = useState({width: 0,height : 0})
    const [coords, setCoords] = useState(null);
    const [initLocation,setInitLocation] = useState(null);
    // const [heatbox,setHeatBox] = useState([])
    // const [annoucecement,setAnnouncement] = useState({english:'No active safety announcements.',hindi:'कोई सक्रिय सुरक्षा घोषणा नहीं है।'})
    // const [crowdStatus,setCrowdStatus] = useState(risk_status.GREEN)
    // const [gatesInfo,setGatesInfo] = useState([])
    const [safeRoute,setSafeRoute] = useState([])
    const [modalVisible, setModalVisible] = useState(false);

    //Contexts
    const telemetry = useTelemetry();
    const {sendSos,sendIncident} = useNetworkActions();
    const venueConfig = useVenueConfig();
    const locationValue = useDeadReckoning(initLocation,mContainerDim,venueConfig)
    const {selectedLanguage} = useLanguage();

    //Ref
    const lastLocationValue = useRef(null)

    //Telemetry Data
    const rawData = telemetry?.data || {};
    const heatbox = rawData.heat_boxes || [];
    const annoucecement = rawData.announcement || {english:'No active safety announcements.',other:'कोई सक्रिय सुरक्षा घोषणा नहीं है।'}
    const crowdStatus = risk_status[rawData.risk_status || "GREEN"];
    const gatesInfo = rawData.gate_info || [];
    useVibration(crowdStatus.label) //Vibration Hook
    

    useEffect(() => 
    {
        if (Object.keys(venueConfig || {}).length === 0 || mContainerDim.width  === 0 || mContainerDim.height === 0 || initLocation)
        {
            return
        }
        const venue_width = venueConfig?.dimensions?.[0] ?? 200
        const venue_height = venueConfig?.dimensions?.[1] ?? 200
        
        const norm_x = (venue_width/8) + Math.random() * (venue_width* (3/8))
        const norm_y = (venue_height/8) + Math.random() * (venue_height* (3/8))
        setInitLocation({px:norm_x,py:norm_y})
    },[venueConfig,mContainerDim])

    useEffect(() => 
    {
        let subscription

        const monitorCoordinates = async () => 
        {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') 
            {
                Alert.alert('Permission Denied','Location access is required for real-time crowd safety alerts.');
                return
            }

            subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 500,
                distanceInterval: 0.1
            },
            (location) => 
            {
                setCoords(location.coords);
            })
        }

            monitorCoordinates()

            return () => 
            {
                if (subscription) 
                {
                    subscription.remove()
                }
            }
    }, [])

    useEffect(() => {
        if (!venueConfig?.dimensions || !heatbox || !locationValue || !mContainerDim.width || !mContainerDim.height || crowdStatus.label !== "DANGER")
        {
            setSafeRoute((prev) => prev.length === 0 ? prev : [])
            return
        }

        if (lastLocationValue.current)
        {
            const dx = locationValue.px - lastLocationValue.current.x
            const dy = locationValue.py - lastLocationValue.current.y
            const dist = Math.sqrt(dx*dx+dy*dy)
            if (dist < 1.3)
            {
                return
            }
        }

        const user = {x: locationValue.px,y: locationValue.py}
        const gate = getSafestGate({x:locationValue?.px || 0,y:locationValue?.py || 0},gatesInfo)
        if (!gate || gate.length === 0)
        {
            setSafeRoute([])
            return
        }
        
        const path = findSafePath({user,gate,heatbox,venueWidth: venueConfig.dimensions[0],venueHeight: venueConfig.dimensions[1],gridSize: 20});
        setSafeRoute((prev) => JSON.stringify(prev) === JSON.stringify(path) ? prev : path);
        lastLocationValue.current = user

    },[locationValue,crowdStatus.label,gatesInfo?.length,venueConfig?.dimensions?.[0],venueConfig?.dimensions?.[1]])

    //Get Dimension Of The Map Container
    const handlemContainerLayout = (event) => 
    {
        const {width,height} = event.layoutMeasurement || event.nativeEvent.layout
        setmContainerDim((prev) => {
            if (prev.width === width && prev.height === height)
            {
                return prev
            }
            return {width,height}
        })
    }

    const handleSOS = () => 
    {   
        sendSos(locationValue,coords)
        Alert.alert('SOS Activated','Your emergency signal has been sent. Showing the nearest safe gate.');
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.appName}>CROWDSHIELD</Text>
                            <Text style={styles.subtitle}>REAL-TIME CROWD SAFETY</Text>
                        </View>
                        <View style={styles.statusContainer}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>MONITORING</Text>
                        </View>
                    </View>

                    <View style={styles.mapContainer} onLayout={handlemContainerLayout}>
                        {true ? (
                            <Svg style={styles.map}>
                                {
                                    heatbox.map((elem,idx) => {
                                        const venueWidth = venueConfig?.dimensions?.[0] ?? 200
                                        const venueHeight = venueConfig?.dimensions?.[1] ?? 200

                                        const cx = (elem.x / venueWidth) * mContainerDim.width
                                        const cy = ((venueHeight - elem.y) / venueHeight) * mContainerDim.height

                                        var color = heat_gradient[0.2]
                                        if (elem.density <= 0.2)
                                        {
                                            color = heat_gradient[0.2]
                                        }
                                        else if (elem.density > 0.2 && elem.density <=0.5)
                                        {
                                            color = lerpColor(heat_gradient[0.2],heat_gradient[0.5],elem.density)
                                        }
                                        else if (elem.density > 0.5 && elem.density <= 0.8)
                                        {
                                            color = lerpColor(heat_gradient[0.5],heat_gradient[0.8],elem.density)
                                        }
                                        else
                                        {
                                            color = lerpColor(heat_gradient[0.8],heat_gradient[1.0],elem.density)
                                        }
                                        return <Circle key={idx} cx={cx} cy={cy} r={5} fill={color}/>
                                    })
                                }
                                { locationValue && venueConfig?.dimensions && (
                                    <G>
                                        <Circle cx={(locationValue.px / venueConfig.dimensions[0]) * mContainerDim.width} cy = {((venueConfig.dimensions[1] - locationValue.py)/venueConfig.dimensions[1])*mContainerDim.height} r= {12} fill='#22c55e' opacity={0.2}/>
                                        <Circle cx={(locationValue.px / venueConfig.dimensions[0]) * mContainerDim.width} cy = {((venueConfig.dimensions[1] - locationValue.py)/venueConfig.dimensions[1])*mContainerDim.height} r= {7} fill='white'/>
                                        <Circle cx={(locationValue.px / venueConfig.dimensions[0]) * mContainerDim.width} cy = {((venueConfig.dimensions[1] - locationValue.py)/venueConfig.dimensions[1])*mContainerDim.height} r= {4} fill='#22c55e'/>
                                    </G>
                                )}
                                {venueConfig && (
                                    venueConfig?.gates?.map((elem,idx) => {
                                        const venueWidth = venueConfig?.dimensions?.[0] ?? 200
                                        const venueHeight = venueConfig?.dimensions?.[1] ?? 200

                                        const cx = (elem.x / venueWidth) * mContainerDim.width
                                        const cy = ((venueHeight - elem.y) / venueHeight) * mContainerDim.height
                                        return <GateIcon key={idx} x={cx} y={cy}/>
                                    })
                                )}
                                { safeRoute.length > 1 && (
                                    <Polyline
                                        points={safeRoute.map((point => `${(point.x / venueConfig.dimensions[0])*mContainerDim.width},${((venueConfig.dimensions[1] - point.y) / venueConfig.dimensions[1])*mContainerDim.height}`)).join(' ')}
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth={5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}
                            </Svg>

                        ) : (
                            <View style={styles.outsideContainer}>
                                <Text style={styles.outsideTitle}>YOU ARE OUTSIDE THE VENUE</Text>
                                <Text style={styles.outsideMessage}>Venue safety monitoring will activate when you enter the venue.</Text>
                            </View>
                        )}
                        </View>

                    <View style={[styles.alertCard,{borderColor:crowdStatus.border_style}]}>
                        <View style={styles.alertHeader}>
                            <View style={[styles.warningIcon,{backgroundColor:crowdStatus.badge_style}]}>
                                <Text style={[styles.warningText,{color:crowdStatus.text_style}]}>{crowdStatus.warn_symbol}</Text>
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.alertTitle}>CROWD STATUS</Text>
                                <Text style={styles.alertMessage}>{crowdStatus.text}</Text>
                            </View>
                            <View style={[styles.crowdBadge,{backgroundColor : crowdStatus.badge_style}]}>
                                <Text style={[styles.crowdText,{color : crowdStatus.text_style}]}>{crowdStatus.label}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.announcementCard}>
                        <View style={styles.announcementHeader}>
                            <Text style={styles.announcementLabel}>ANNOUNCEMENT</Text>
                            {/* <Text style={styles.language}>EN / HI</Text> */}
                            <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.7} style={{flexDirection:'row',alignItems:'center',gap:4}}>
                                <Feather name="globe" size={12} color="#38BDF8" />
                                <Text style={styles.language}>
                                    {(selectedLanguage || 'hi-IN').split('-')[0].toUpperCase()} ▾
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.announcementText}>{annoucecement.english}</Text>
                        <Text style={styles.announcementOther}>{annoucecement.other}</Text>
                    </View>

                </ScrollView>
                
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
                        <Text style={styles.sosIcon}>Emergency</Text>
                    </TouchableOpacity>
                    {/* <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
                        <Text style={styles.reportIcon}>!</Text>
                        <Text style={styles.reportText}>REPORT</Text>
                    </TouchableOpacity> */}
                    <ReportButton sendReport={sendIncident} currentCoords={coords}/>
                </View>
                <StatusBar style="light" />
                <LanguageModal visible={modalVisible} onClose={()=>setModalVisible(false)}/>
            </SafeAreaView>
    </SafeAreaProvider>
    );
}