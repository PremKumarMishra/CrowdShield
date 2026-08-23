import { useState } from 'react'
import TelemetryContext from './context/TelemetryContext'
import Page from './components/Page'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <TelemetryContext>
        <div className='min-h-screen w-full bg-[#0b0f19] text-[#e2e8f0] backdrop-blur-md'>
            <Page/>
        </div>
    </TelemetryContext>
  )
}

export default App
