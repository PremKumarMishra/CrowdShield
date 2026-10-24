import React from 'react'

const HeaderBrand = () => {
  return (
    <div className='flex gap-2.5 items-center'>
        <div className='w-3 h-3 rounded-full bg-emerald-500 animate-ping'/>
        <h1 className='uppercase text-xl tracking-widest font-bold text-white'>Crowd<span className='text-blue-500 uppercase'>Shield</span></h1>
        <span className='text-xs text-gray-400'>v1.0 command center</span>
    </div>
  )
}

export default HeaderBrand
