const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma');
const { verifyNextAuthToken } = require('../middleware/auth');
const carrierFactory = require('../services/carrier/carrier-factory');
const { getTrackingUrl } = require('../services/carrier/carrier-urls');
const { trackingLimiter } = require('../config/rate-limit');

const router = express.Router();

/**
 * POST /api/tracking/track
 * Add a new tracking number for processing
 */
router.post('/track', 
  trackingLimiter,
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

    // Get tracking request with carrier and shipment data
    const request = await prisma.trackingRequest.findFirst({
      where: {
        id: id,
        userId: userId
      },
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
          }
        },
        shipment: true
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Tracking request not found' });
    }

    res.json({
      request: {
        id: request.id,
        tracking_number: request.trackingNumber,
        status: request.status,
        created_at: request.createdAt,
        updated_at: request.updatedAt,
        carrier: request.carrier
      },
      shipment: request.shipment || null
    });

  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tracking/:id/url
 * Get tracking URL for a specific tracking request
 * Opens carrier's tracking page
 */
router.get('/:id/url', verifyNextAuthToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get tracking request
    const request = await prisma.trackingRequest.findFirst({
      where: {
        id: id,
        userId: userId
      },
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ 
        error: 'Tracking request not found' 
      });
    }

    // Generate tracking URL
    const trackingUrl = getTrackingUrl(
      request.carrier.name,
      request.trackingNumber
    );

    if (!trackingUrl) {
      return res.status(400).json({ 
        error: `Tracking URL not available for carrier: ${request.carrier.name}` 
      });
    }

    res.json({
      url: trackingUrl,
      trackingNumber: request.trackingNumber,
      carrier: request.carrier.name,
      carrierDisplayName: request.carrier.displayName
    });

  } catch (error) {
    console.error('Get tracking URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Detect carrier from tracking number pattern
 */
function detectCarrierFromTrackingNumber(trackingNumber) {
  const patterns = {
    'UPS': [
      /^1Z[0-9A-Z]{16}$/,           // 1Z followed by 16 alphanumeric (no spaces)
      /^1Z\s[0-9A-Z\s]+$/,          // 1Z followed by alphanumeric with spaces
      /^[0-9]{10,}$/                 // 10+ digits
    ],
    'FedEx': [
      /^[0-9]{12}$/,                 // 12 digits
      /^[0-9]{14}$/                  // 14 digits
    ],
    'USPS': [
      /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/,  // 2 letters, 9 digits, 2 letters
      /^[0-9]{4}\s[0-9]{4}\s[0-9]{4}\s[0-9]{4}$/  // 4 groups of 4 digits
    ],
    'DHL': [
      /^[0-9]{10,11}$/               // 10-11 digits
    ],
    'Amazon': [
      /^TBA[0-9]{10}$/               // TBA followed by 10 digits
    ]
  };

  for (const [carrier, carrierPatterns] of Object.entries(patterns)) {
    for (const pattern of carrierPatterns) {
      if (pattern.test(trackingNumber)) {
        return carrier;
      }
    }
  }
  
  return null; // Unknown pattern
}

/**
 * POST /api/tracking/add
 * Add a new tracking item (frontend compatibility endpoint)
 * Now supports automatic carrier detection
 */
router.post('/add', 
  trackingLimiter,
  verifyNextAuthToken,
  [
    body('trackingNumber')
      .isString()
      .isLength({ min: 8, max: 50 })
      .withMessage('Tracking number must be between 8 and 50 characters'),
    body('brand')
      .optional()
      .isString()
      .customSanitizer(value => value ? value.toUpperCase() : value) // Convert to uppercase
      .isIn(['USPS', 'UPS', 'FEDEX', 'DHL', 'AMAZON', 'OTHER'])
      .withMessage('Brand must be one of: USPS, UPS, FedEx, DHL, Amazon, other'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
  ],
  async (req, res) => {
    try {
      console.log('=== POST /api/tracking/add received ===');
      console.log('Request body:', req.body);
      console.log('User ID:', req.user?.id);
      
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { trackingNumber, brand, description } = req.body;
      const userId = req.user.id;
      
      console.log('Processing tracking:', { trackingNumber, brand, description, userId });

      // Auto-detect carrier if not provided or if brand is "other"
      let detectedBrand = brand;
      if (!brand || brand === 'OTHER') {
        console.log('No brand provided or brand is "OTHER", attempting auto-detection...');
        detectedBrand = detectCarrierFromTrackingNumber(trackingNumber);
        console.log('Detected brand:', detectedBrand);
        
        if (!detectedBrand) {
          return res.status(400).json({ 
            error: 'Unable to detect carrier from tracking number. Please specify the carrier manually.',
            trackingNumber: trackingNumber
          });
        }
      }
      
      // Normalize brand name for database lookup
      // Database uses uppercase for most, but "FedEx" is stored as "FedEx"
      if (detectedBrand === 'FEDEX') {
        detectedBrand = 'FedEx';
      } else if (detectedBrand === 'AMAZON') {
        detectedBrand = 'Amazon';
      }

      // Check if carrier is available (skip for now - only USPS is implemented)
      console.log('Checking carrier availability for:', detectedBrand);
      const isCarrierServiceAvailable = carrierFactory.isCarrierAvailable(detectedBrand);
      console.log('Carrier service available:', isCarrierServiceAvailable);
      
      // Allow adding tracking even if carrier service is not implemented yet
      // The tracking will be stored with status 'pending' until carrier is implemented
      if (!isCarrierServiceAvailable) {
        console.log(`${detectedBrand} service not implemented yet, storing tracking request without processing`);
      }

      // Check if tracking request already exists
      console.log('Getting carrier ID for:', detectedBrand);
      const carrierId = await getCarrierId(detectedBrand);
      console.log('Carrier ID:', carrierId);
      
      if (!carrierId) {
        console.log('Carrier ID not found for brand:', detectedBrand);
        console.log('Available carriers in database:');
        const allCarriers = await prisma.carrier.findMany({
          select: { id: true, name: true, displayName: true }
        });
        console.log(allCarriers);
        
        return res.status(400).json({ 
          error: `Carrier ${detectedBrand} not found in database`,
          availableCarriers: allCarriers.map(c => c.name),
          suggestion: 'Please run: npm run db:seed'
        });
      }
      
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
      console.log('Creating tracking request with data:', {
        userId, trackingNumber, carrierId, description
      });
      
      const trackingRequest = await prisma.trackingRequest.create({
        data: {
          userId: userId,
          trackingNumber: trackingNumber,
          carrierId: carrierId,
          status: 'pending',
          metadata: description ? { description } : null
        }
      });
      
      console.log('Tracking request created:', trackingRequest.id);

      // Process tracking in background only if carrier service is available
      if (isCarrierServiceAvailable) {
        console.log('Starting background processing for:', trackingRequest.id);
        processTrackingAsync(trackingRequest.id, trackingNumber, detectedBrand);
      } else {
        console.log('Skipping background processing - carrier service not implemented yet');
      }

      // Return in frontend expected format
      const response = {
        id: trackingRequest.id,
        trackingNumber: trackingNumber,
        brand: detectedBrand.toLowerCase(),
        description: description || '',
        dateAdded: trackingRequest.createdAt.toISOString()
      };
      
      console.log('Sending response:', response);
      res.status(201).json(response);

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
      status: request.status || 'pending',
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
 * GET /api/tracking/debug
 * Debug endpoint to check database status
 */
router.get('/debug', verifyNextAuthToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's tracking requests
    const trackingRequests = await prisma.trackingRequest.findMany({
      where: { userId },
      include: {
        carrier: {
          select: {
            name: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // Get carriers
    const carriers = await prisma.carrier.findMany({
      select: {
        id: true,
        name: true,
        displayName: true
      }
    });
    
    res.json({
      userId,
      trackingRequests,
      carriers,
      totalRequests: trackingRequests.length
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/tracking/seed
 * Seed the database with carriers (development only)
 */
router.post('/seed', async (req, res) => {
  try {
    console.log('🌱 Seeding database with carriers...');
    
    const carriers = [
      { name: 'USPS', displayName: 'United States Postal Service' },
      { name: 'UPS', displayName: 'United Parcel Service' },
      { name: 'FedEx', displayName: 'FedEx Corporation' },
      { name: 'DHL', displayName: 'DHL International' },
      { name: 'Amazon', displayName: 'Amazon Logistics' }
    ];
    
    const createdCarriers = [];
    
    for (const carrier of carriers) {
      const existing = await prisma.carrier.findUnique({
        where: { name: carrier.name }
      });
      
      if (!existing) {
        const newCarrier = await prisma.carrier.create({
          data: carrier
        });
        createdCarriers.push(newCarrier);
        console.log(`✅ Created carrier: ${carrier.displayName}`);
      } else {
        console.log(`⏭️  Carrier already exists: ${carrier.displayName}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Database seeded successfully',
      createdCarriers: createdCarriers.length,
      totalCarriers: carriers.length
    });
    
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed database', details: error.message });
  }
});

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
