import Header from "./Header";
import Content from "./Content";
import React, { useState,createContext } from 'react'
import VenueSetupModal from "./VenueSetupModal";

export const venueContext = createContext(null)

const Page = () => {
    const [venueModalOpen,setVenueModalOpen] = useState(true)
    const [venueConfig, setVenueConfig] = useState(null)
    const saveConfig = (payload) => {
        setVenueConfig(payload)
        setVenueModalOpen(false)
    }
    return (
        <>
        <VenueSetupModal isOpen={venueModalOpen} onClose={() => setVenueModalOpen(false)} onSaveConfiguration={saveConfig}/>
        <Header/>
        <venueContext.Provider value={venueConfig}>
            <Content/>
        </venueContext.Provider>
        </>
    )
}

export default Page
