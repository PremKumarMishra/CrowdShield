import {useAudioRecorder,RecordingPresets,AudioModule,setAudioModeAsync} from 'expo-audio'
import {Feather} from '@expo/vector-icons'
import {TouchableOpacity,Text,ActivityIndicator} from 'react-native'
import { styles } from '../Theme'
import { useEffect, useState } from 'react'
const ReportButton = ({sendReport,currentCoords}) =>
{
    const [isProcessing,setIsProcessing] = useState(false)
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
    const isRecording = audioRecorder.isRecording;

    useEffect(() => {
        const setupRecorder = async () =>
        {
            await AudioModule.requestRecordingPermissionsAsync()
            await setAudioModeAsync({playsInSilentMode:true,allowsRecording:true})
        }
        setupRecorder()
    },[])

    const startRecording = async () => 
    {
        try
        {   
            const permission = await AudioModule.requestRecordingPermissionsAsync()
            // console.log(permission);
            if (!permission.granted)
            {
                return
            }
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
        }
        catch (err)
        {
            console.log("Failed To Record Aduio",err);
        }
    }
    const stopRecording = async () =>
    {
        // console.log(2);
        
        if (!audioRecorder.isRecording)
        {
            return;
        }
        // console.log(3);
        try
        {
            setIsProcessing(true)
            await audioRecorder.stop()
            const uri = audioRecorder.uri
            // console.log(uri);
            if (uri)
            {
                // console.log(sendReport);
                await sendReport(uri,currentCoords);
            }
        }
        catch (err)
        {
            console.log("Failed to stop recording",err);
            
        }
        finally
        {
            setIsProcessing(false)
        }
    }

    return (
        <TouchableOpacity style={styles.reportButton} onPressIn={startRecording} onPressOut={stopRecording} >
            {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" size="large"/>
            ):(
                <Feather name={isRecording ? "radio" : "mic"} style={styles.reportIcon}/>
            )}
            <Text style={styles.reportText}>{isRecording ? 'RECORDING ...' : isProcessing?'SENDING ...' : 'REPORT'}</Text>
        </TouchableOpacity>
    )   
}
export default ReportButton