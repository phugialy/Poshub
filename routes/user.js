const express = require('express');
const { prisma } = require('../lib/prisma');
const { verifyNextAuthToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/user/dashboard
 * Get user dashboard data with all tracking information
 */
router.get('/dashboard', verifyNextAuthToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's tracking requests with shipment data
    const trackingData = await prisma.trackingRequest.findMany({
      where: {
        userId: userId
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
            expectedDeliveryDate: true,
            currentStatus: true,
            currentLocation: true,
            shippedDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate statistics
    const stats = {
      total: trackingData.length,
      pending: trackingData.filter(item => item.status === 'pending').length,
      processing: trackingData.filter(item => item.status === 'processing').length,
      completed: trackingData.filter(item => item.status === 'completed').length,
      failed: trackingData.filter(item => item.status === 'failed').length
    };

    // Group by carrier
    const carrierStats = trackingData.reduce((acc, item) => {
      const carrierName = item.carrier?.name || 'Unknown';
      acc[carrierName] = (acc[carrierName] || 0) + 1;
      return acc;
    }, {});

    res.json({
      stats,
      carrierStats,
      trackingData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/user/profile
 * Get user profile information
 */
router.get('/profile', verifyNextAuthToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await prisma.userProfile.findUnique({
      where: { id: userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.fullName,
        image: profile.avatarUrl
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/user/profile
 * Update user profile information
 */
router.put('/profile', verifyNextAuthToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url } = req.body;

    const updateData = {};
    if (full_name !== undefined) updateData.fullName = full_name;
    if (avatar_url !== undefined) updateData.avatarUrl = avatar_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const profile = await prisma.userProfile.update({
      where: { id: userId },
      data: updateData
    });

    res.json(profile);

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/user/shipments
 * Get all shipments for the user
 */
router.get('/shipments', verifyNextAuthToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const offset = (page - 1) * parseInt(limit);

    // Build where clause
    const whereClause = {
      trackingRequest: {
        userId: userId
      }
    };

    // Filter by status if provided
    if (status) {
      whereClause.trackingRequest.status = status;
    }

    // Fetch shipments with tracking request and carrier data
    const shipments = await prisma.shipment.findMany({
      where: whereClause,
      include: {
        trackingRequest: {
          include: {
            carrier: {
              select: {
                name: true,
                displayName: true
              }
            }
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
      shipments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: shipments.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
