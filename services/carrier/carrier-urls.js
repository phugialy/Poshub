/**
 * Carrier Tracking URL Generator
 * Generates tracking URLs for different carriers
 */

const carrierUrls = {
  USPS: (trackingNumber) => {
    // Remove spaces and format
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanNumber}`;
  },
  
  UPS: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.ups.com/track?tracknum=${cleanNumber}`;
  },
  
  FedEx: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.fedex.com/fedextrack/?trknbr=${cleanNumber}`;
  },
  
  DHL: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.dhl.com/en/express/tracking.html?AWB=${cleanNumber}`;
  },
  
  Amazon: (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    return `https://www.amazon.com/progress-tracker/package/${cleanNumber}`;
  }
};

/**
 * Get tracking URL for a carrier and tracking number
 * @param {string} carrierName - Name of the carrier
 * @param {string} trackingNumber - Tracking number
 * @returns {string|null} - Tracking URL or null if carrier not supported
 */
function getTrackingUrl(carrierName, trackingNumber) {
  if (!carrierName || !trackingNumber) {
    return null;
  }

  const normalizedCarrier = carrierName.toUpperCase();
  const urlGenerator = carrierUrls[normalizedCarrier];
  
  if (!urlGenerator) {
    return null;
  }

  return urlGenerator(trackingNumber);
}

module.exports = {
  getTrackingUrl,
  carrierUrls
};

