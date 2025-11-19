/**
 * Carrier Metadata and Branding
 * Shared utility for carrier information (logos, colors, etc.)
 * Can be reused across web, extension, and mobile apps
 */

export const CARRIERS = {
  USPS: {
    name: 'USPS',
    displayName: 'USPS',
    color: '#004B87',
    logo: '📮', // Emoji as fallback, can be replaced with SVG/icon
    iconClass: 'usps-icon',
  },
  UPS: {
    name: 'UPS',
    displayName: 'UPS',
    color: '#7B2009',
    logo: '🚚',
    iconClass: 'ups-icon',
  },
  FedEx: {
    name: 'FedEx',
    displayName: 'FedEx',
    color: '#4D148C',
    logo: '📦',
    iconClass: 'fedex-icon',
  },
  DHL: {
    name: 'DHL',
    displayName: 'DHL',
    color: '#FFCC00',
    logo: '📬',
    iconClass: 'dhl-icon',
  },
  Amazon: {
    name: 'Amazon',
    displayName: 'Amazon',
    color: '#FF9900',
    logo: '📦',
    iconClass: 'amazon-icon',
  },
};

/**
 * Get carrier metadata by name
 */
export function getCarrierInfo(carrierName) {
  if (!carrierName) return null;
  
  const normalized = carrierName.toUpperCase();
  
  // Handle variations
  if (normalized === 'FEDEX' || normalized === 'FED EX') {
    return CARRIERS.FedEx;
  }
  if (normalized === 'AMAZON') {
    return CARRIERS.Amazon;
  }
  
  return CARRIERS[normalized] || {
    name: carrierName,
    displayName: carrierName,
    color: '#6b7280',
    logo: '📦',
    iconClass: 'default-icon',
  };
}

/**
 * Get status color
 */
export function getStatusColor(status) {
  const statusColors = {
    pending: { bg: '#fef3c7', text: '#92400e', icon: '⏳' },
    processing: { bg: '#dbeafe', text: '#1e40af', icon: '🚚' },
    completed: { bg: '#d1fae5', text: '#065f46', icon: '✅' },
    failed: { bg: '#fee2e2', text: '#991b1b', icon: '❌' },
  };
  
  return statusColors[status] || { bg: '#f3f4f6', text: '#6b7280', icon: '❓' };
}

/**
 * Format tracking number for display (adds spaces for readability)
 */
export function formatTrackingNumber(trackingNumber) {
  if (!trackingNumber) return '';
  
  // Remove existing spaces
  const clean = trackingNumber.replace(/\s+/g, '');
  
  // Format based on length and pattern
  if (clean.length <= 12) {
    return clean;
  }
  
  // For longer numbers, add spaces every 4 characters
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

