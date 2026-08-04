// Decision Minds Branding Component
// Reusable logo component for Decision Minds

import { useTheme } from '../../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faBuilding } from '@fortawesome/free-solid-svg-icons'

// Decision Minds Logo Only - No text, just the logo with white background
export const DecisionMindsLogoOnly = ({ className = '', size = 'large' }) => {
  const height = size === 'large' ? '80px' : '60px';
  return (
    <div className={`dm-logo-only ${className}`} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      width: 'fit-content'
    }}>
      <img 
        src="/assets/decisionminds-logo-1.png" 
        alt="Decision Minds" 
        style={{ height: height, width: 'auto' }} 
      />
    </div>
  )
}

export const DecisionMindsLogo = ({ className = '', onClick }) => {
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
        padding: theme === 'dark' ? '4px 10px' : '0',
        transition: 'background-color 0.3s ease',
      }}
    >
      <img
        src="/assets/decisionminds-logo-1.png"
        alt="Decision Minds"
        style={{ height: '30px', width: 'auto' }}
      />
    </div>
  )
}

export const DecisionMindsLogoSmall = ({ className = '', onClick }) => {
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
        borderRadius: theme === 'dark' ? '6px' : '0',
        padding: theme === 'dark' ? '3px 8px' : '0',
        transition: 'background-color 0.3s ease',
      }}
    >
      <img
        src="/assets/decisionminds-logo-1.png"
        alt="Decision Minds"
        style={{ height: '24px', width: 'auto' }}
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

export default { DecisionMindsLogo, DecisionMindsLogoSmall, PythonIcon, DatabaseIcon, ClockIcon, ChecklistIcon, HouseIcon, BuildingIcon, TimerIcon }
