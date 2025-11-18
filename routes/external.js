const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma');
const { verifyGoogleToken } = require('../middleware/external-auth');
const carrierFactory = require('../services/carrier/carrier-factory');
const { externalApiLimiter } = require('../config/rate-limit');

const router = express.Router();

// Apply external API rate limiter to all routes in this router
router.use(externalApiLimiter);

/**
 * POST /api/external/track
 * External API endpoint for other apps to submit tracking data
 * Requires Google OAuth token for authentication
 * Carrier is optional - can be updated later via PUT /track/:id/carrier
 */
router.post('/track', 
  verifyGoogleToken,
  [
    body('trackingNumber')
      .isString()
      .isLength({ min: 8, max: 50 })
      .withMessage('Tracking number must be between 8 and 50 characters'),
    body('carrier')
      .optional()
      .isString()
      .isIn(['USPS', 'UPS', 'FedEx', 'DHL'])
      .withMessage('Carrier must be one of: USPS, UPS, FedEx, DHL'),
    body('userId')
      .optional()
      .isString()
      .withMessage('userId must be a string'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('metadata must be an object'),
    body('callbackUrl')
      .optional()
      .isURL()
      .withMessage('callbackUrl must be a valid URL'),
    body('appName')
      .optional()
      .isString()
      .withMessage('appName must be a string')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { 
        trackingNumber, 
        carrier, 
        userId, 
        metadata = {}, 
        callbackUrl, 
        appName = 'External App' 
      } = req.body;

      // Use external user ID or fallback to Google user ID
      const externalUserId = userId || req.googleUser.id;
      const googleUser = req.googleUser;

      // If carrier is provided, validate it
      let carrierId = null;
      if (carrier) {
        if (!carrierFactory.isCarrierAvailable(carrier)) {
          return res.status(400).json({ 
            error: `${carrier} tracking service is not available`,
            availableCarriers: carrierFactory.getAvailableCarriers()
          });
        }
        carrierId = await getCarrierId(carrier);
      }

      // Check if tracking request already exists for this external user
      const existingRequest = await prisma.trackingRequest.findFirst({
        where: {
          userId: externalUserId,
          trackingNumber: trackingNumber,
          ...(carrierId && { carrierId: carrierId })
        },
        select: {
          id: true,
          status: true,
          carrierId: true
        }
      });

      if (existingRequest) {
        return res.status(409).json({
          error: 'Tracking number already exists for this user',
          trackingId: existingRequest.id,
          status: existingRequest.status,
          hasCarrier: !!existingRequest.carrierId
        });
      }

      // Create tracking request with external app metadata
      const trackingRequest = await prisma.trackingRequest.create({
        data: {
          userId: externalUserId,
          trackingNumber: trackingNumber,
          carrierId: carrierId, // Will be null if carrier not provided
          status: carrierId ? 'pending' : 'awaiting_carrier', // New status for missing carrier
          // Store external app metadata in a JSON field
          metadata: {
            appName,
            callbackUrl,
            externalMetadata: metadata,
            googleUser: {
              id: googleUser.id,
              email: googleUser.email,
              name: googleUser.name
            }
          }
        }
      });

      // Only process tracking if carrier is provided
      if (carrierId) {
        processTrackingAsync(trackingRequest.id, trackingNumber, carrier, {
          appName,
          callbackUrl,
          externalUserId,
          metadata
        });
      }

      res.status(201).json({
        success: true,
        message: carrierId ? 
          'Tracking request created successfully' : 
          'Tracking request created successfully. Carrier not specified - use PUT /track/:id/carrier to add carrier and start processing.',
        trackingId: trackingRequest.id,
        status: carrierId ? 'pending' : 'awaiting_carrier',
        hasCarrier: !!carrierId,
        estimatedProcessingTime: carrierId ? '30-60 seconds' : 'N/A - carrier required',
        nextSteps: carrierId ? 
          ['Check status via GET /track/:id/status'] : 
          ['Add carrier via PUT /track/:id/carrier', 'Then check status via GET /track/:id/status']
      });

    } catch (error) {
      console.error('External tracking route error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process tracking request'
      });
    }
  }
);

/**
 * PUT /api/external/track/:trackingId/carrier
 * Update carrier for an existing tracking request
 * This allows apps to add carrier after initial submission
 */
router.put('/track/:trackingId/carrier', 
  verifyGoogleToken,
  [
    body('carrier')
      .isString()
      .isIn(['USPS', 'UPS', 'FedEx', 'DHL'])
      .withMessage('Carrier must be one of: USPS, UPS, FedEx, DHL')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { trackingId } = req.params;
      const { carrier } = req.body;
      const googleUser = req.googleUser;

      // Find the tracking request
      const trackingRequest = await prisma.trackingRequest.findFirst({
        where: {
          id: trackingId,
          userId: googleUser.id
        },
        include: {
          carrier: true
        }
      });

      if (!trackingRequest) {
        return res.status(404).json({ 
          error: 'Tracking request not found or access denied' 
        });
      }

      // Check if carrier is already set
      if (trackingRequest.carrierId) {
        return res.status(400).json({
          error: 'Carrier already set for this tracking request',
          currentCarrier: trackingRequest.carrier?.displayName,
          message: 'Use PUT /track/:id/carrier with force=true to override'
        });
      }

      // Validate carrier availability
      if (!carrierFactory.isCarrierAvailable(carrier)) {
        return res.status(400).json({ 
          error: `${carrier} tracking service is not available`,
          availableCarriers: carrierFactory.getAvailableCarriers()
        });
      }

      const carrierId = await getCarrierId(carrier);

      // Update tracking request with carrier
      const updatedRequest = await prisma.trackingRequest.update({
        where: { id: trackingId },
        data: {
          carrierId: carrierId,
          status: 'pending'
        },
        include: {
          carrier: true
        }
      });

      // Start processing tracking
      processTrackingAsync(trackingId, trackingRequest.trackingNumber, carrier, {
        appName: trackingRequest.metadata?.appName || 'External App',
        callbackUrl: trackingRequest.metadata?.callbackUrl,
        externalUserId: trackingRequest.userId,
        metadata: trackingRequest.metadata?.externalMetadata || {}
      });

      res.json({
        success: true,
        message: 'Carrier updated successfully',
        trackingId: trackingId,
        carrier: updatedRequest.carrier.displayName,
        status: 'pending',
        estimatedProcessingTime: '30-60 seconds'
      });

    } catch (error) {
      console.error('Update carrier route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/external/status/:trackingId
 * Get tracking status for external apps
 */
router.get('/status/:trackingId', verifyGoogleToken, async (req, res) => {
  try {
    const { trackingId } = req.params;
    const googleUser = req.googleUser;

    // Get tracking request with shipment data
    const trackingRequest = await prisma.trackingRequest.findFirst({
      where: {
        id: trackingId,
        userId: googleUser.id // Ensure user can only access their own data
      },
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
          }
        },
        shipment: {
          select: {
            trackingNumber: true,
            carrier: true,
            currentStatus: true,
            currentLocation: true,
            expectedDeliveryDate: true,
            shippedDate: true,
            rawData: true
          }
        }
      }
    });

    if (!trackingRequest) {
      return res.status(404).json({ 
        error: 'Tracking request not found or access denied' 
      });
    }

    res.json({
      trackingId: trackingRequest.id,
      trackingNumber: trackingRequest.trackingNumber,
      carrier: trackingRequest.carrier?.displayName || null,
      status: trackingRequest.status,
      createdAt: trackingRequest.createdAt,
      updatedAt: trackingRequest.updatedAt,
      shipment: trackingRequest.shipment || null,
      needsCarrier: trackingRequest.status === 'awaiting_carrier',
      nextSteps: trackingRequest.status === 'awaiting_carrier' ? 
        ['Add carrier via PUT /track/:id/carrier'] : 
        trackingRequest.status === 'pending' ? 
        ['Processing in background - check again in 30-60 seconds'] :
        trackingRequest.status === 'completed' ?
        ['Tracking completed successfully'] :
        trackingRequest.status === 'failed' ?
        ['Tracking failed - check carrier and tracking number'] :
        []
    });

  } catch (error) {
    console.error('External status route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/external/user/trackings
 * Get all tracking requests for the authenticated external user
 */
router.get('/user/trackings', verifyGoogleToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const googleUser = req.googleUser;
    const offset = (page - 1) * parseInt(limit);

    let whereClause = {
      userId: googleUser.id
    };

    if (status) {
      whereClause.status = status;
    }

    const trackingRequests = await prisma.trackingRequest.findMany({
      where: whereClause,
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
          }
        },
        shipment: {
          select: {
            currentStatus: true,
            currentLocation: true,
            expectedDeliveryDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: parseInt(limit)
    });

    res.json({
      trackings: trackingRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: trackingRequests.length,
        hasMore: trackingRequests.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('External user trackings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/external/carriers
 * Get available carriers for external apps
 */
router.get('/carriers', (req, res) => {
  try {
    const carriers = carrierFactory.getAvailableCarriers();
    const status = carrierFactory.getCarrierStatus();

    res.json({
      carriers: carriers.map(name => ({
        name,
        available: status[name]?.available || false,
        configured: status[name]?.configured || false
      })),
      message: 'Use these carrier names when submitting tracking requests'
    });
  } catch (error) {
    console.error('External carriers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to get carrier ID by name
 */
async function getCarrierId(carrierName) {
  const carrier = await prisma.carrier.findUnique({
    where: {
      name: carrierName.toUpperCase()
    },
    select: {
      id: true
    }
  });

  return carrier?.id;
}

/**
 * Process tracking request asynchronously with external app callback
 */
async function processTrackingAsync(trackingRequestId, trackingNumber, carrierName, externalData) {
  try {
    // Update status to processing
    await prisma.trackingRequest.update({
      where: { id: trackingRequestId },
      data: { status: 'processing' }
    });

    // Get carrier service
    const carrierService = carrierFactory.getCarrier(carrierName);
    if (!carrierService) {
      throw new Error(`Carrier ${carrierName} not found`);
    }

    // Track the package
    const trackingData = await carrierService.trackPackage(trackingNumber);

    if (!trackingData.success) {
      throw new Error(trackingData.error);
    }

    // Save shipment data
    await prisma.shipment.upsert({
      where: { trackingRequestId: trackingRequestId },
      update: {
        trackingNumber: trackingData.trackingNumber,
        carrier: trackingData.carrier,
        expectedDeliveryDate: trackingData.expectedDeliveryDate,
        currentStatus: trackingData.currentStatus,
        currentLocation: trackingData.currentLocation,
        shippedDate: trackingData.shippedDate,
        rawData: trackingData.rawData
      },
      create: {
        trackingRequestId: trackingRequestId,
        trackingNumber: trackingData.trackingNumber,
        carrier: trackingData.carrier,
        expectedDeliveryDate: trackingData.expectedDeliveryDate,
        currentStatus: trackingData.currentStatus,
        currentLocation: trackingData.currentLocation,
        shippedDate: trackingData.shippedDate,
        rawData: trackingData.rawData
      }
    });

    // Update tracking request status
    await prisma.trackingRequest.update({
      where: { id: trackingRequestId },
      data: { status: 'completed' }
    });

    console.log(`Successfully processed external tracking ${trackingNumber} for ${carrierName}`);

    // Send callback notification to external app if callback URL provided
    if (externalData.callbackUrl) {
      try {
        const axios = require('axios');
        await axios.post(externalData.callbackUrl, {
          trackingId: trackingRequestId,
          trackingNumber: trackingNumber,
          status: 'completed',
          carrier: carrierName,
          shipment: trackingData,
          timestamp: new Date().toISOString()
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostalHub-External-API/1.0'
          }
        });
        console.log(`Callback sent to ${externalData.callbackUrl}`);
      } catch (callbackError) {
        console.error('Callback failed:', callbackError.message);
        // Don't fail the main process if callback fails
      }
    }

  } catch (error) {
    console.error(`Error processing external tracking ${trackingNumber}:`, error);

    // Update status to failed
    await prisma.trackingRequest.update({
      where: { id: trackingRequestId },
      data: { status: 'failed' }
    });

    // Send failure callback if URL provided
    if (externalData.callbackUrl) {
      try {
        const axios = require('axios');
        await axios.post(externalData.callbackUrl, {
          trackingId: trackingRequestId,
          trackingNumber: trackingNumber,
          status: 'failed',
          carrier: carrierName,
          error: error.message,
          timestamp: new Date().toISOString()
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostalHub-External-API/1.0'
          }
        });
      } catch (callbackError) {
        console.error('Failure callback failed:', callbackError.message);
      }
    }
  }
}

module.exports = router;
