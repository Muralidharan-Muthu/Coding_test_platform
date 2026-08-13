// Meptrasoft AI Technologies Branding Component
// Reusable logo component for Meptrasoft AI Technologies

import { useTheme } from '../../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faBuilding } from '@fortawesome/free-solid-svg-icons'

// The logo artwork is dark navy/teal on a transparent background, so it
// disappears against any dark surface. Give it a white chip behind it
// whenever the surrounding theme is dark so it stays legible.

// Large logo — used on landing / auth pages
export const PlatformLogoOnly = ({ className = '', size = 'large' }) => {
  const { theme } = useTheme()
  const height = size === 'large' ? '80px' : '60px'
  return (
    <div className={`dm-logo-only ${className}`} style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === 'dark' ? '#ffffff' : 'transparent',
      borderRadius: '12px',
      padding: '12px 20px',
      width: 'fit-content',
      boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
      border: theme === 'dark' ? '1px solid rgba(15, 23, 42, 0.06)' : 'none',
      transition: 'background-color 0.3s ease',
    }}>
      <img
        src="/assets/meptrasoft-logo.png"
        alt="Meptrasoft AI Technologies"
        style={{ height: height, width: 'auto' }}
      />
    </div>
  )
}

// Standard header logo
export const PlatformLogo = ({ className = '', onClick }) => {
  const { theme } = useTheme()
  return (
    <div
      className={`dm-logo ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: theme === 'dark' ? '#ffffff' : 'transparent',
        borderRadius: theme === 'dark' ? '8px' : '0',
        padding: theme === 'dark' ? '5px 12px' : '0',
        boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
        border: theme === 'dark' ? '1px solid rgba(15, 23, 42, 0.06)' : 'none',
        transition: 'background-color 0.3s ease',
      }}
    >
      <img
        src="/assets/meptrasoft-logo.png"
        alt="Meptrasoft AI Technologies"
        style={{ height: '30px', width: 'auto' }}
      />
    </div>
  )
}

// Small header logo (used in exam pages)
export const PlatformLogoSmall = ({ className = '', onClick }) => {
  const { theme } = useTheme()
  return (
    <div
      className={`dm-logo-small ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: theme === 'dark' ? '#ffffff' : 'transparent',
        borderRadius: theme === 'dark' ? '8px' : '0',
        padding: theme === 'dark' ? '5px 10px' : '0',
        boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
        border: theme === 'dark' ? '1px solid rgba(15, 23, 42, 0.06)' : 'none',
        transition: 'background-color 0.3s ease',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <img
        src="/assets/meptrasoft-logo.png"
        alt="Meptrasoft AI Technologies"
        style={{ height: '24px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}


// Python Icon - Uses different image based on theme
export const PythonIcon = ({ size = 16 }) => {
  const { theme } = useTheme()
  return (
    <img 
      src={theme === 'dark' ? '/assets/py-white.png' : '/assets/py.png'} 
      alt="Python" 
      style={{ height: size, width: 'auto', display: 'inline-block', verticalAlign: 'middle' }} 
    />
  )
}

// Database Icon for SQL
export const DatabaseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M4 6v.01M20 6v.01M4 12v.01M20 12v.01M4 18v.01M20 18v.01" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

// Clock Icon for duration
export const ClockIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

// Checklist Icon for questions
export const ChecklistIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
)

// House Icon - Font Awesome
export const HouseIcon = ({ size = 16 }) => (
  <FontAwesomeIcon icon={faHouse} style={{ fontSize: size }} />
)

// Building Icon - Font Awesome
export const BuildingIcon = ({ size = 16 }) => (
  <FontAwesomeIcon icon={faBuilding} style={{ fontSize: size }} />
)

// Timer Icon
export const TimerIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="14" r="8"/>
    <line x1="12" y1="10" x2="12" y2="2"/>
    <line x1="12" y1="14" x2="15" y2="17"/>
    <polyline points="14 6 17 3 20 6"/>
  </svg>
)

export default { PlatformLogo, PlatformLogoSmall, PythonIcon, DatabaseIcon, ClockIcon, ChecklistIcon, HouseIcon, BuildingIcon, TimerIcon }

