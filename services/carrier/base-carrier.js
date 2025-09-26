/**
 * Base Carrier Service Class
 * All carrier-specific implementations should extend this class
 */
class BaseCarrier {
  constructor(name, apiKey) {
    this.name = name;
    this.apiKey = apiKey;
    this.isActive = true;
  }

  /**
   * Abstract method - must be implemented by subclasses
   * @param {string} trackingNumber - The tracking number to lookup
   * @returns {Promise<Object>} - Standardized tracking data
   */
  async trackPackage(trackingNumber) {
    throw new Error(`trackPackage method must be implemented for ${this.name}`);
  }

  /**
   * Standardize tracking data format
   * @param {Object} rawData - Raw data from carrier API
   * @returns {Object} - Standardized format
   */
  standardizeData(rawData) {
    return {
      trackingNumber: rawData.trackingNumber || '',
      carrier: this.name,
      expectedDeliveryDate: rawData.expectedDeliveryDate || null,
      currentStatus: rawData.currentStatus || 'Unknown',
      currentLocation: rawData.currentLocation || 'Unknown',
      shippedDate: rawData.shippedDate || null,
      rawData: rawData,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Validate tracking number format
   * @param {string} trackingNumber - The tracking number to validate
   * @returns {boolean} - Whether the tracking number is valid
   */
  validateTrackingNumber(trackingNumber) {
    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return false;
    }
    
    // Remove spaces and convert to uppercase
    const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase();
    
    // Basic validation - at least 8 characters
    return cleaned.length >= 8;
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - The error to handle
   * @returns {Object} - Standardized error response
   */
  handleError(error) {
    console.error(`${this.name} API Error:`, error);
    
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      carrier: this.name,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if carrier service is available
   * @returns {boolean} - Whether the service is active
   */
  isServiceActive() {
    return this.isActive && this.apiKey;
  }
}

module.exports = BaseCarrier;
