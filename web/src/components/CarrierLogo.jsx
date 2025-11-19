/**
 * Carrier Logo Component
 * Displays carrier logo/icon with brand colors
 * Simple and reusable across platforms
 */

import { getCarrierInfo } from '../lib/carriers'

function CarrierLogo({ carrierName, size = 'medium' }) {
  const carrierInfo = getCarrierInfo(carrierName)
  
  if (!carrierInfo) {
    return (
      <div className="carrier-logo-default" style={{ fontSize: size === 'large' ? '24px' : '20px' }}>
        📦
      </div>
    )
  }

  const sizeClasses = {
    small: '16px',
    medium: '20px',
    large: '28px',
  }

  return (
    <div 
      className="carrier-logo-wrapper"
      style={{
        backgroundColor: `${carrierInfo.color}15`,
        color: carrierInfo.color,
        fontSize: sizeClasses[size] || sizeClasses.medium,
      }}
    >
      <span className="carrier-emoji">{carrierInfo.logo}</span>
    </div>
  )
}

export default CarrierLogo

