const axios = require('axios');
const BaseCarrier = require('./base-carrier');

/**
 * USPS Carrier Service Implementation
 * Based on USPS Tracking API v3
 */
class USPSCarrier extends BaseCarrier {
  constructor(apiKey) {
    super('USPS', apiKey);
    this.baseUrl = 'https://secure.shippingapis.com/shippingapi.dll';
    this.userId = apiKey; // USPS uses userId instead of traditional API key
  }

  /**
   * Track a USPS package
   * @param {string} trackingNumber - USPS tracking number
   * @returns {Promise<Object>} - Standardized tracking data
   */
  async trackPackage(trackingNumber) {
    try {
      if (!this.isServiceActive()) {
        throw new Error('USPS service is not properly configured');
      }

      if (!this.validateTrackingNumber(trackingNumber)) {
        throw new Error('Invalid USPS tracking number format');
      }

      // Clean tracking number
      const cleanTrackingNumber = trackingNumber.replace(/\s/g, '').toUpperCase();

      // USPS API XML request
      const xmlRequest = this.buildXMLRequest(cleanTrackingNumber);
      
      const response = await axios.get(this.baseUrl, {
        params: {
          API: 'TrackV2',
          XML: xmlRequest
        },
        timeout: 10000
      });

      const trackingData = this.parseXMLResponse(response.data);
      return this.standardizeData(trackingData);

    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Build XML request for USPS API
   * @param {string} trackingNumber - Clean tracking number
   * @returns {string} - XML request string
   */
  buildXMLRequest(trackingNumber) {
    return `
      <TrackRequest USERID="${this.userId}">
        <TrackID ID="${trackingNumber}"></TrackID>
      </TrackRequest>
    `;
  }

  /**
   * Parse USPS XML response
   * @param {string} xmlResponse - XML response from USPS API
   * @returns {Object} - Parsed tracking data
   */
  parseXMLResponse(xmlResponse) {
    try {
      // Simple XML parsing (in production, use proper XML parser like xml2js)
      const hasError = xmlResponse.includes('<Error>');
      
      if (hasError) {
        const errorMatch = xmlResponse.match(/<Description>(.*?)<\/Description>/);
        const errorMessage = errorMatch ? errorMatch[1] : 'Unknown error';
        throw new Error(`USPS API Error: ${errorMessage}`);
      }

      // Extract tracking details
      const trackingNumberMatch = xmlResponse.match(/<TrackID ID="(.*?)"/);
      const statusMatch = xmlResponse.match(/<Status>(.*?)<\/Status>/);
      const summaryMatch = xmlResponse.match(/<TrackSummary>(.*?)<\/TrackSummary>/);
      const locationMatch = xmlResponse.match(/<TrackDetail>.*?<EventCity>(.*?)<\/EventCity>.*?<EventState>(.*?)<\/EventState>/);

      const trackingNumber = trackingNumberMatch ? trackingNumberMatch[1] : '';
      const currentStatus = statusMatch ? statusMatch[1] : 'Unknown';
      const summary = summaryMatch ? summaryMatch[1] : '';
      const location = locationMatch ? `${locationMatch[1]}, ${locationMatch[2]}` : 'Unknown';

      // Extract dates (simplified parsing)
      const shippedDateMatch = xmlResponse.match(/<EventDate>(.*?)<\/EventDate>/);
      const shippedDate = shippedDateMatch ? shippedDateMatch[1] : null;

      return {
        trackingNumber,
        currentStatus: currentStatus || summary,
        currentLocation: location,
        shippedDate: shippedDate ? this.parseUSPSDate(shippedDate) : null,
        expectedDeliveryDate: null, // USPS doesn't provide this in basic tracking
        rawData: xmlResponse
      };

    } catch (error) {
      throw new Error(`Failed to parse USPS response: ${error.message}`);
    }
  }

  /**
   * Parse USPS date format
   * @param {string} dateString - USPS date string
   * @returns {string} - ISO date string
   */
  parseUSPSDate(dateString) {
    try {
      // USPS date format: "January 1, 2024 12:00 pm"
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate USPS tracking number format
   * @param {string} trackingNumber - The tracking number to validate
   * @returns {boolean} - Whether the tracking number is valid for USPS
   */
  validateTrackingNumber(trackingNumber) {
    if (!super.validateTrackingNumber(trackingNumber)) {
      return false;
    }

    const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase();
    
    // USPS tracking number patterns
    const uspsPatterns = [
      /^[0-9]{20}$/, // Priority Mail Express
      /^[0-9]{22}$/, // Priority Mail
      /^[0-9]{13}$/, // Priority Mail Express
      /^[0-9A-Z]{13}$/, // Priority Mail
      /^[0-9A-Z]{12}$/, // First-Class Mail
      /^[0-9]{10}$/, // Media Mail
    ];

    return uspsPatterns.some(pattern => pattern.test(cleaned));
  }
}

module.exports = USPSCarrier;
