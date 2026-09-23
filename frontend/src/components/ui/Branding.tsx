// Meptrasoft AI Technologies Branding Component
// Reusable logo component for Meptrasoft AI Technologies

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faBuilding } from '@fortawesome/free-solid-svg-icons'

// Large logo — used on landing / auth pages
export const PlatformLogoOnly = ({
  className = '',
  size = 'large'
}: {
  className?: string
  size?: 'large' | 'medium' | 'small'
}) => {
  const height = size === 'large' ? '54px' : size === 'medium' ? '42px' : '32px'
  const padding = size === 'large' ? 'px-7 py-2.5' : size === 'medium' ? 'px-5 py-2' : 'px-3 py-1'
  return (
    <div
      className={`dm-logo-only bg-white rounded-2xl ${padding} shadow-xs border border-slate-200/90 inline-flex items-center justify-center transition-all duration-200 ${className}`}
    >
      <img
        src="/assets/meptrasoft-logo.png"
        alt="Meptrasoft AI Technologies"
        style={{ height, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block', background: 'transparent' }}
      />
    </div>
  )
}

// Standard header logo
export const PlatformLogo = ({
  className = '',
  onClick
}: {
  className?: string
  onClick?: () => void
}) => {
  return (
    <div
      className={`dm-logo bg-white rounded-xl px-4 py-1.5 shadow-xs border border-slate-200/90 inline-flex items-center justify-center transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-slate-50' : ''
      } ${className}`}
      onClick={onClick}
    >
      <img
        src="/assets/meptrasoft-logo.png"
        alt="Meptrasoft AI Technologies"
        style={{ height: '36px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block', background: 'transparent' }}
      />
    </div>
  )
}

// Small header logo (used in exam pages, topbars & sidebars)
export const PlatformLogoSmall = ({
  className = '',
  onClick
}: {
  className?: string
  onClick?: () => void
}) => {
  return (
    <div
      className={`dm-logo-small bg-white rounded-xl px-3.5 py-1 shadow-xs border border-slate-200/90 inline-flex items-center justify-center transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-slate-50' : ''
      } ${className}`}
      onClick={onClick}
    >
      <img
        src="/assets/meptrasoft-logo.png"
        alt="Meptrasoft AI Technologies"
        style={{ height: '32px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block', background: 'transparent' }}
      />
    </div>
  )
}

// Square mini logo (used for collapsed sidebars or tight spaces)
export const PlatformLogoMini = ({
  className = '',
  onClick
}: {
  className?: string
  onClick?: () => void
}) => {
  return (
    <div
      className={`dm-logo-mini w-11 h-11 bg-white rounded-xl p-1 shadow-xs border border-slate-200/90 inline-flex items-center justify-center transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-slate-50' : ''
      } ${className}`}
      onClick={onClick}
    >
      <img
        src="/assets/meptrasoft-icon.png"
        alt="Meptrasoft AI Technologies"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: 'transparent' }}
      />
    </div>
  )
}

// Python Icon
export const PythonIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <img 
      src="/assets/py.png" 
      alt="Python" 
      style={{ height: size, width: 'auto', display: 'inline-block', verticalAlign: 'middle' }} 
    />
  )
}

// Database Icon for SQL
export const DatabaseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M4 6v.01M20 6v.01M4 12v.01M20 12v.01M4 18v.01M20 18v.01" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

// Clock Icon for duration
export const ClockIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

// Checklist Icon for questions
export const ChecklistIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
)

// House Icon - Font Awesome
export const HouseIcon = ({ size = 16 }: { size?: number }) => (
  <FontAwesomeIcon icon={faHouse} style={{ fontSize: size }} />
)

// Building Icon - Font Awesome
export const BuildingIcon = ({ size = 16 }: { size?: number }) => (
  <FontAwesomeIcon icon={faBuilding} style={{ fontSize: size }} />
)

// Timer Icon
export const TimerIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="14" r="8"/>
    <line x1="12" y1="10" x2="12" y2="2"/>
    <line x1="12" y1="14" x2="15" y2="17"/>
    <polyline points="14 6 17 3 20 6"/>
  </svg>
)

export default { PlatformLogo, PlatformLogoSmall, PlatformLogoOnly, PlatformLogoMini, PythonIcon, DatabaseIcon, ClockIcon, ChecklistIcon, HouseIcon, BuildingIcon, TimerIcon }
