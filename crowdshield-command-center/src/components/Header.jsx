import React from 'react'
import HeaderBrand from './HeaderBrand'
import HeaderInformation from './HeaderInformation'

const Header = () => {
  return (
    <div className='flex justify-between bg-[#101623] border-b-2 border-[#1A2330] px-4 py-3'>
      <HeaderBrand/>
      <HeaderInformation/>
    </div>
  )
}

export default Header
