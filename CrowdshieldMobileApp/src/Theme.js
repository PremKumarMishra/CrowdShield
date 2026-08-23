
import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
    safeArea:
    {
        flex: 1,
        backgroundColor: '#020617',
    },

    scrollView:
    {
        flex: 1,
    },

    container:
    {
        backgroundColor: '#020617',
        paddingBottom: 40
    },

    header:
    {
        height: 70,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },

    appName:
    {
        color: '#22d3ee',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 2,
    },

    subtitle:
    {
        color: '#64748b',
        fontSize: 9,
        letterSpacing: 1.5,
        marginTop: 2,
    },

    statusContainer:
    {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },

    statusDot:
    {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },

    statusText:
    {
        color: '#22c55e',
        fontSize: 11,
        fontWeight: '800',
    },

    mapContainer:
    {
        height: 200,
        overflow: 'hidden',
        borderRadius:14,
        marginTop: 12,
        marginBottom: 12,
        marginHorizontal:12,
        backgroundColor: '#0f1728',
        borderWidth: 1,
        borderColor: '#1e3048'
    },

    map:
    {
        width:'100%',
        height : '100%'
    },
    mapText:
    {
        color: '#334155',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 4,
    },
    outsideContainer:
    {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40
    },
    outsideTitle: 
    {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: 10
    },
    outsideMessage: 
    {
        color: '#94a3b8',
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        maxWidth: 300
    },
    locationLoading:
    {
        position: 'absolute',
        bottom: 15,
        color: '#64748b',
        fontSize: 11,
    },

    locationMarker:
    {
        position: 'absolute',
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },

    locationPulse:
    {
        position: 'absolute',
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
    },

    locationDot:
    {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22d3ee',
        borderWidth: 2,
        borderColor: '#fff',
    },

    alertCard:
    {
        marginHorizontal: 12,
        marginBottom: 12,
        padding: 14,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#14532d',
    },

    alertHeader:
    {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    warningIcon:
    {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#14532d',
        alignItems: 'center',
        justifyContent: 'center',
    },

    warningText:
    {
        color: '#4ade80',
        fontWeight: '900',
    },

    alertTitle:
    {
        color: '#94a3b8',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.2,
    },

    alertMessage:
    {
        color: '#e2e8f0',
        fontSize: 12,
        marginTop: 3
    },

    crowdBadge:
    {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
        backgroundColor: '#14532d'
    },

    crowdText:
    {
        color: '#4ade80',
        fontSize: 8,
        fontWeight: '900'
    },

    announcementCard:
    {
        marginHorizontal: 12,
        marginBottom: 12,
        padding: 15,
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1e3a5f',
    },

    announcementHeader:
    {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },

    announcementLabel:
    {
        color: '#38bdf8',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },

    language:
    {
        color: '#64748b',
        fontSize: 9,
        fontWeight: '800',
    },

    announcementText:
    {
        color: '#f1f5f9',
        fontSize: 13,
        lineHeight: 19,
    },

    announcementOther:
    {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 6,
    },

    actions:
    {
        flexDirection: 'row',
        justifyContent :'space-between',
        paddingHorizontal: 12,
        paddingTop:8,
        paddingBottom:16,
        gap: 10,
    },

    sosButton:
    {
        flex:1,
        height: 62,
        borderRadius: 12,
        backgroundColor: '#7f1d1d',
        borderWidth: 1,
        borderColor: '#ef4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:'center'
    },

    sosIcon:
    {
        color: '#fff',
        fontSize: 15,
        fontWeight: '900',
    },

    sosTitle:
    {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900',
    },

    sosSubtitle:
    {
        color: '#fecaca',
        fontSize: 9,
        marginTop: 2,
    },

    reportButton:
    {
        flex:1,
        height: 62,
        borderRadius: 12,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#475569',
        alignItems: 'center',
        justifyContent: 'center',
    },

    reportIcon:
    {
        color: '#fbbf24',
        fontSize: 24
    },

    reportText:
    {
        color: '#cbd5e1',
        fontSize: 9,
        fontWeight: '900',
        marginTop: 3,
    },

    coordinates:
    {
        alignItems: 'center',
        paddingTop: 14,
    },

    coordinatesText:
    {
        color: '#334155',
        fontSize: 9,
        fontFamily: 'monospace',
    },

});
