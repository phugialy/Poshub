const USPSCarrier = require('./usps');

/**
 * Carrier Factory
 * Creates and manages carrier service instances
 */
class CarrierFactory {
  constructor() {
    this.carriers = new Map();
    this.initializeCarriers();
  }

  /**
   * Initialize available carriers
   */
  initializeCarriers() {
    // USPS
    if (process.env.USPS_USER_ID) {
      const usps = new USPSCarrier(process.env.USPS_USER_ID);
      this.carriers.set('USPS', usps);
      this.carriers.set('usps', usps);
    }

    // TODO: Add other carriers as they're implemented
    // UPS, FedEx, DHL will be added here
  }

  /**
   * Get carrier service by name
   * @param {string} carrierName - Name of the carrier (case insensitive)
   * @returns {Object|null} - Carrier service instance or null
   */
  getCarrier(carrierName) {
    if (!carrierName) {
      return null;
    }

    const normalizedName = carrierName.toUpperCase();
    return this.carriers.get(normalizedName) || this.carriers.get(carrierName.toLowerCase());
  }

  /**
   * Get all available carriers
   * @returns {Array} - Array of available carrier names
   */
  getAvailableCarriers() {
    return Array.from(this.carriers.keys()).filter(name => 
      name === name.toUpperCase() // Only return uppercase names to avoid duplicates
    );
  }

  /**
   * Check if carrier is available
   * @param {string} carrierName - Name of the carrier
   * @returns {boolean} - Whether the carrier is available
   */
  isCarrierAvailable(carrierName) {
    const carrier = this.getCarrier(carrierName);
    return carrier && carrier.isServiceActive();
  }

  /**
   * Get carrier status information
   * @returns {Object} - Status of all carriers
   */
  getCarrierStatus() {
    const status = {};
    
    this.carriers.forEach((carrier, name) => {
      if (name === name.toUpperCase()) { // Only include uppercase names
        status[name] = {
          available: carrier.isServiceActive(),
          configured: !!carrier.apiKey
        };
      }
    });

    return status;
  }
}

// Create singleton instance
const carrierFactory = new CarrierFactory();

module.exports = carrierFactory;
