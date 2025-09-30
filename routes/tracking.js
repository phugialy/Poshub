const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma');
const { verifyNextAuthToken } = require('../middleware/auth');
const carrierFactory = require('../services/carrier/carrier-factory');

const router = express.Router();

/**
 * POST /api/tracking/track
 * Add a new tracking number for processing
 */
router.post('/track', 
  verifyNextAuthToken,
  [
    body('trackingNumber')
      .isString()
      .isLength({ min: 8, max: 50 })
      .withMessage('Tracking number must be between 8 and 50 characters'),
    body('carrier')
      .isString()
      .isIn(['USPS', 'UPS', 'FedEx', 'DHL'])
      .withMessage('Carrier must be one of: USPS, UPS, FedEx, DHL')
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

      const { trackingNumber, carrier } = req.body;
      const userId = req.user.id;

      // Check if carrier is available
      if (!carrierFactory.isCarrierAvailable(carrier)) {
        return res.status(400).json({ 
          error: `${carrier} tracking service is not available` 
        });
      }

      // Check if tracking request already exists
      const carrierId = await getCarrierId(carrier);
      const existingRequest = await prisma.trackingRequest.findFirst({
        where: {
          userId: userId,
          trackingNumber: trackingNumber,
          carrierId: carrierId
        },
        select: {
          id: true,
          status: true
        }
      });

      if (existingRequest) {
        return res.status(409).json({
          error: 'Tracking number already exists',
          trackingId: existingRequest.id,
          status: existingRequest.status
        });
      }

      // Create tracking request
      const trackingRequest = await prisma.trackingRequest.create({
        data: {
          userId: userId,
          trackingNumber: trackingNumber,
          carrierId: carrierId,
          status: 'pending'
        }
      });

      // Process tracking in background
      processTrackingAsync(trackingRequest.id, trackingNumber, carrier);

      res.status(201).json({
        message: 'Tracking request created successfully',
        trackingId: trackingRequest.id,
        status: 'pending'
      });

    } catch (error) {
      console.error('Tracking route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/tracking/requests
 * Get user's tracking requests
 */
router.get('/requests', verifyNextAuthToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * parseInt(limit);

    const requests = await prisma.trackingRequest.findMany({
      where: {
        userId: userId
      },
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
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
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: requests.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tracking/requests/:id
 * Get specific tracking request with shipment data
 */
router.get('/requests/:id', verifyNextAuthToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get tracking request
    const { data: request, error: requestError } = await supabase
      .from('tracking_requests')
      .select(`
        id,
        tracking_number,
        status,
        created_at,
        updated_at,
        carriers (name, display_name)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Tracking request not found' });
    }

    // Get shipment data
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('tracking_request_id', id)
      .single();

    res.json({
      request,
      shipment: shipment || null
    });

  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tracking/add
 * Add a new tracking item (frontend compatibility endpoint)
 */
router.post('/add', 
  verifyNextAuthToken,
  [
    body('trackingNumber')
      .isString()
      .isLength({ min: 8, max: 50 })
      .withMessage('Tracking number must be between 8 and 50 characters'),
    body('brand')
      .isString()
      .isIn(['USPS', 'UPS', 'FedEx', 'DHL'])
      .withMessage('Brand must be one of: USPS, UPS, FedEx, DHL'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
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

      const { trackingNumber, brand, description } = req.body;
      const userId = req.user.id;

      // Check if carrier is available
      if (!carrierFactory.isCarrierAvailable(brand)) {
        return res.status(400).json({ 
          error: `${brand} tracking service is not available` 
        });
      }

      // Check if tracking request already exists
      const carrierId = await getCarrierId(brand);
      const existingRequest = await prisma.trackingRequest.findFirst({
        where: {
          userId: userId,
          trackingNumber: trackingNumber,
          carrierId: carrierId
        },
        select: {
          id: true,
          status: true
        }
      });

      if (existingRequest) {
        return res.status(409).json({
          error: 'Tracking number already exists',
          trackingId: existingRequest.id,
          status: existingRequest.status
        });
      }

      // Create tracking request
      const trackingRequest = await prisma.trackingRequest.create({
        data: {
          userId: userId,
          trackingNumber: trackingNumber,
          carrierId: carrierId,
          status: 'pending',
          metadata: description ? { description } : null
        }
      });

      // Process tracking in background
      processTrackingAsync(trackingRequest.id, trackingNumber, brand);

      // Return in frontend expected format
      res.status(201).json({
        id: trackingRequest.id,
        trackingNumber: trackingNumber,
        brand: brand.toLowerCase(),
        description: description || '',
        dateAdded: trackingRequest.createdAt.toISOString()
      });

    } catch (error) {
      console.error('Add tracking error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/tracking/user
 * Get user's tracking items (frontend compatibility endpoint)
 */
router.get('/user', verifyNextAuthToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.trackingRequest.findMany({
      where: {
        userId: userId
      },
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to frontend expected format
    const trackings = requests.map(request => ({
      id: request.id,
      trackingNumber: request.trackingNumber,
      brand: request.carrier?.name?.toLowerCase() || 'unknown',
      description: request.metadata?.description || '',
      dateAdded: request.createdAt.toISOString()
    }));

    res.json({
      trackings
    });

  } catch (error) {
    console.error('Get user trackings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/tracking/update
 * Update an existing tracking item (frontend compatibility endpoint)
 */
router.put('/update', 
  verifyNextAuthToken,
  [
    body('id')
      .isString()
      .withMessage('ID is required'),
    body('trackingNumber')
      .optional()
      .isString()
      .isLength({ min: 8, max: 50 })
      .withMessage('Tracking number must be between 8 and 50 characters'),
    body('brand')
      .optional()
      .isString()
      .isIn(['USPS', 'UPS', 'FedEx', 'DHL'])
      .withMessage('Brand must be one of: USPS, UPS, FedEx, DHL'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
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

      const { id, trackingNumber, brand, description } = req.body;
      const userId = req.user.id;

      // Find the tracking request
      const existingRequest = await prisma.trackingRequest.findFirst({
        where: {
          id: id,
          userId: userId
        },
        include: {
          carrier: {
            select: {
              name: true
            }
          }
        }
      });

      if (!existingRequest) {
        return res.status(404).json({ error: 'Tracking item not found' });
      }

      // Prepare update data
      const updateData = {};
      
      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }
      
      if (brand) {
        const carrierId = await getCarrierId(brand);
        if (!carrierId) {
          return res.status(400).json({ error: 'Invalid brand' });
        }
        updateData.carrierId = carrierId;
      }
      
      if (description !== undefined) {
        updateData.metadata = { 
          ...existingRequest.metadata, 
          description 
        };
      }

      // Update the tracking request
      const updatedRequest = await prisma.trackingRequest.update({
        where: { id: id },
        data: updateData,
        include: {
          carrier: {
            select: {
              name: true
            }
          }
        }
      });

      // Return in frontend expected format
      res.json({
        id: updatedRequest.id,
        trackingNumber: updatedRequest.trackingNumber,
        brand: updatedRequest.carrier?.name?.toLowerCase() || 'unknown',
        description: updatedRequest.metadata?.description || '',
        dateAdded: updatedRequest.createdAt.toISOString()
      });

    } catch (error) {
      console.error('Update tracking error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/tracking/delete
 * Delete a tracking item (frontend compatibility endpoint)
 */
router.delete('/delete', 
  verifyNextAuthToken,
  [
    body('id')
      .isString()
      .withMessage('ID is required')
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

      const { id } = req.body;
      const userId = req.user.id;

      // Find the tracking request
      const existingRequest = await prisma.trackingRequest.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!existingRequest) {
        return res.status(404).json({ error: 'Tracking item not found' });
      }

      // Delete the tracking request (cascade will handle shipment)
      await prisma.trackingRequest.delete({
        where: { id: id }
      });

      res.json({
        success: true,
        message: 'Tracking item deleted successfully'
      });

    } catch (error) {
      console.error('Delete tracking error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/tracking/carriers
 * Get available carriers
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
      }))
    });
  } catch (error) {
    console.error('Get carriers error:', error);
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
 * Process tracking request asynchronously
 */
async function processTrackingAsync(trackingRequestId, trackingNumber, carrierName) {
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

    console.log(`Successfully processed tracking ${trackingNumber} for ${carrierName}`);

  } catch (error) {
    console.error(`Error processing tracking ${trackingNumber}:`, error);

    // Update status to failed
    await prisma.trackingRequest.update({
      where: { id: trackingRequestId },
      data: { status: 'failed' }
    });
  }
}

module.exports = router;
