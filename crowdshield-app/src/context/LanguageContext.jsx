import { useState,useEffect,createContext,useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage_key = "user_lang"
const languageContext = createContext(null);


export const useLanguage = () =>
{
    const context = useContext(languageContext)
    return context
}

const LanguageContext = ({children}) =>
{
    const [selectedLanguage,setSelectedLanguage] = useState('hi-IN')
    const [isLoading,setIsLoading] = useState(true)
    //Load Saved Languages
    useEffect(() => 
    {
        const load = async() =>
        {
            try
            {
                const saved = await AsyncStorage.getItem(storage_key)
                if (saved)
                {
                    setSelectedLanguage(saved)
                }
            }
            catch(err)
            {
                console.log("Failed to load saved data",err);       
            }
            finally
            {
                setIsLoading(false)
            }
        }
        load();
    },[])


    const changeLanguage =  async (lang) =>
    {
        try
        {
            setSelectedLanguage(lang);
            await AsyncStorage.setItem(storage_key,lang);
        }
        catch (err)
        {
            console.log("Failed to set language",err);
            
        }
    }

    return (
        <languageContext.Provider value={{selectedLanguage,changeLanguage,isLoading}}>
            {children}
        </languageContext.Provider>
    )
}

export default LanguageContext