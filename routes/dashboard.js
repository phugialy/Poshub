const express = require('express');
const { prisma } = require('../lib/prisma');
const { verifyGoogleToken } = require('../middleware/external-auth');

const router = express.Router();

/**
 * GET /api/external/dashboard/overview
 * Get dashboard overview with key metrics and statistics
 */
router.get('/overview', verifyGoogleToken, async (req, res) => {
  try {
    const googleUser = req.googleUser;
    const userId = googleUser.id;

    // Get total counts
    const totalTrackings = await prisma.trackingRequest.count({
      where: { userId: userId }
    });

    const completedTrackings = await prisma.trackingRequest.count({
      where: { 
        userId: userId,
        status: 'completed'
      }
    });

    const pendingTrackings = await prisma.trackingRequest.count({
      where: { 
        userId: userId,
        status: 'pending'
      }
    });

    const processingTrackings = await prisma.trackingRequest.count({
      where: { 
        userId: userId,
        status: 'processing'
      }
    });

    const awaitingCarrierTrackings = await prisma.trackingRequest.count({
      where: { 
        userId: userId,
        status: 'awaiting_carrier'
      }
    });

    const failedTrackings = await prisma.trackingRequest.count({
      where: { 
        userId: userId,
        status: 'failed'
      }
    });

    // Get carrier breakdown
    const carrierStats = await prisma.trackingRequest.groupBy({
      by: ['carrierId'],
      where: { userId: userId },
      _count: {
        carrierId: true
      },
      orderBy: {
        _count: {
          carrierId: 'desc'
        }
      }
    });

    // Get carrier names
    const carrierDetails = await Promise.all(
      carrierStats.map(async (stat) => {
        const carrier = await prisma.carrier.findUnique({
          where: { id: stat.carrierId },
          select: { name: true, displayName: true }
        });
        return {
          carrierId: stat.carrierId,
          carrierName: carrier?.name || 'Unknown',
          displayName: carrier?.displayName || 'Unknown',
          count: stat._count.carrierId
        };
      })
    );

    // Get recent activity (last 10 trackings)
    const recentTrackings = await prisma.trackingRequest.findMany({
      where: { userId: userId },
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
      take: 10
    });

    // Calculate success rate
    const successRate = totalTrackings > 0 ? 
      Math.round((completedTrackings / totalTrackings) * 100) : 0;

    res.json({
      overview: {
        totalTrackings,
        completedTrackings,
        pendingTrackings,
        processingTrackings,
        awaitingCarrierTrackings,
        failedTrackings,
        successRate
      },
      carrierBreakdown: carrierDetails,
      recentActivity: recentTrackings.map(tracking => ({
        id: tracking.id,
        trackingNumber: tracking.trackingNumber,
        carrier: tracking.carrier?.displayName || 'Unknown',
        status: tracking.status,
        currentStatus: tracking.shipment?.currentStatus,
        currentLocation: tracking.shipment?.currentLocation,
        expectedDeliveryDate: tracking.shipment?.expectedDeliveryDate,
        createdAt: tracking.createdAt,
        updatedAt: tracking.updatedAt
      })),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/external/dashboard/trackings
 * Get all trackings with advanced filtering, sorting, and pagination
 */
router.get('/trackings', verifyGoogleToken, async (req, res) => {
  try {
    const googleUser = req.googleUser;
    const userId = googleUser.id;
    
    // Parse query parameters
    const {
      page = 1,
      limit = 20,
      status,
      carrier,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      includeShipment = 'true'
    } = req.query;

    const offset = (page - 1) * parseInt(limit);
    const includeShipmentData = includeShipment === 'true';

    // Build where clause
    let whereClause = {
      userId: userId
    };

    // Status filter
    if (status) {
      if (Array.isArray(status)) {
        whereClause.status = { in: status };
      } else {
        whereClause.status = status;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    // Search filter (tracking number or metadata)
    if (search) {
      whereClause.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['orderId'], string_contains: search } },
        { metadata: { path: ['customerName'], string_contains: search } }
      ];
    }

    // Carrier filter
    if (carrier) {
      const carrierRecord = await prisma.carrier.findUnique({
        where: { name: carrier.toUpperCase() },
        select: { id: true }
      });
      if (carrierRecord) {
        whereClause.carrierId = carrierRecord.id;
      }
    }

    // Build include clause
    const includeClause = {
      carrier: {
        select: {
          name: true,
          displayName: true
        }
      }
    };

    if (includeShipmentData) {
      includeClause.shipment = {
        select: {
          trackingNumber: true,
          carrier: true,
          currentStatus: true,
          currentLocation: true,
          expectedDeliveryDate: true,
          shippedDate: true,
          rawData: true
        }
      };
    }

    // Validate sortBy
    const validSortFields = ['createdAt', 'updatedAt', 'trackingNumber', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get trackings with pagination
    const [trackings, totalCount] = await Promise.all([
      prisma.trackingRequest.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: {
          [sortField]: sortDirection
        },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.trackingRequest.count({
        where: whereClause
      })
    ]);

    // Transform response
    const transformedTrackings = trackings.map(tracking => ({
      id: tracking.id,
      trackingNumber: tracking.trackingNumber,
      carrier: tracking.carrier?.displayName || 'Unknown',
      carrierName: tracking.carrier?.name || null,
      status: tracking.status,
      metadata: tracking.metadata,
      createdAt: tracking.createdAt,
      updatedAt: tracking.updatedAt,
      shipment: tracking.shipment || null
    }));

    res.json({
      trackings: transformedTrackings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasNext: offset + parseInt(limit) < totalCount,
        hasPrev: page > 1
      },
      filters: {
        status: status || null,
        carrier: carrier || null,
        search: search || null,
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy: sortField,
        sortOrder: sortDirection
      }
    });

  } catch (error) {
    console.error('Dashboard trackings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/external/dashboard/analytics
 * Get analytics data for charts and insights
 */
router.get('/analytics', verifyGoogleToken, async (req, res) => {
  try {
    const googleUser = req.googleUser;
    const userId = googleUser.id;
    const { period = '30d' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get daily tracking counts
    const dailyTrackings = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        status
      FROM tracking_requests 
      WHERE user_id = ${userId} 
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at), status
      ORDER BY date ASC
    `;

    // Get carrier performance
    const carrierPerformance = await prisma.$queryRaw`
      SELECT 
        c.display_name as carrier_name,
        c.name as carrier_code,
        COUNT(tr.id) as total_trackings,
        COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as successful_trackings,
        COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) as failed_trackings,
        ROUND(
          COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) * 100.0 / COUNT(tr.id), 2
        ) as success_rate
      FROM tracking_requests tr
      LEFT JOIN carriers c ON tr.carrier_id = c.id
      WHERE tr.user_id = ${userId}
        AND tr.created_at >= ${startDate}
      GROUP BY c.id, c.display_name, c.name
      ORDER BY total_trackings DESC
    `;

    // Get status distribution
    const statusDistribution = await prisma.trackingRequest.groupBy({
      by: ['status'],
      where: {
        userId: userId,
        createdAt: { gte: startDate }
      },
      _count: {
        status: true
      }
    });

    // Get delivery performance (for completed trackings with expected delivery dates)
    const deliveryPerformance = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN s.expected_delivery_date IS NULL THEN 'No ETA'
          WHEN s.expected_delivery_date >= CURRENT_DATE THEN 'On Time'
          ELSE 'Delayed'
        END as delivery_status,
        COUNT(*) as count
      FROM tracking_requests tr
      LEFT JOIN shipments s ON tr.id = s.tracking_request_id
      WHERE tr.user_id = ${userId}
        AND tr.status = 'completed'
        AND tr.created_at >= ${startDate}
      GROUP BY 
        CASE 
          WHEN s.expected_delivery_date IS NULL THEN 'No ETA'
          WHEN s.expected_delivery_date >= CURRENT_DATE THEN 'On Time'
          ELSE 'Delayed'
        END
    `;

    res.json({
      period: period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      },
      dailyTrackings: dailyTrackings,
      carrierPerformance: carrierPerformance,
      statusDistribution: statusDistribution.map(stat => ({
        status: stat.status,
        count: stat._count.status
      })),
      deliveryPerformance: deliveryPerformance,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/external/dashboard/bulk-status
 * Get status for multiple tracking IDs at once
 */
router.get('/bulk-status', verifyGoogleToken, async (req, res) => {
  try {
    const googleUser = req.googleUser;
    const userId = googleUser.id;
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({ 
        error: 'Missing required parameter: ids',
        message: 'Provide tracking IDs as comma-separated values in the ids query parameter'
      });
    }

    const trackingIds = ids.split(',').map(id => id.trim());
    
    if (trackingIds.length > 100) {
      return res.status(400).json({ 
        error: 'Too many tracking IDs',
        message: 'Maximum 100 tracking IDs allowed per request'
      });
    }

    const trackings = await prisma.trackingRequest.findMany({
      where: {
        id: { in: trackingIds },
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
            currentStatus: true,
            currentLocation: true,
            expectedDeliveryDate: true,
            shippedDate: true
          }
        }
      }
    });

    // Create a map for quick lookup
    const trackingMap = {};
    trackings.forEach(tracking => {
      trackingMap[tracking.id] = {
        id: tracking.id,
        trackingNumber: tracking.trackingNumber,
        carrier: tracking.carrier?.displayName || 'Unknown',
        status: tracking.status,
        currentStatus: tracking.shipment?.currentStatus,
        currentLocation: tracking.shipment?.currentLocation,
        expectedDeliveryDate: tracking.shipment?.expectedDeliveryDate,
        shippedDate: tracking.shipment?.shippedDate,
        updatedAt: tracking.updatedAt
      };
    });

    // Include not found IDs
    const notFoundIds = trackingIds.filter(id => !trackingMap[id]);

    res.json({
      trackings: trackingMap,
      notFound: notFoundIds,
      found: trackings.length,
      total: trackingIds.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/external/dashboard/export
 * Export tracking data in various formats
 */
router.get('/export', verifyGoogleToken, async (req, res) => {
  try {
    const googleUser = req.googleUser;
    const userId = googleUser.id;
    const { format = 'json', status, carrier, startDate, endDate } = req.query;

    // Build where clause (similar to trackings endpoint)
    let whereClause = {
      userId: userId
    };

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    if (carrier) {
      const carrierRecord = await prisma.carrier.findUnique({
        where: { name: carrier.toUpperCase() },
        select: { id: true }
      });
      if (carrierRecord) {
        whereClause.carrierId = carrierRecord.id;
      }
    }

    // Get all matching trackings
    const trackings = await prisma.trackingRequest.findMany({
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
            expectedDeliveryDate: true,
            shippedDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const exportData = trackings.map(tracking => ({
      id: tracking.id,
      trackingNumber: tracking.trackingNumber,
      carrier: tracking.carrier?.displayName || 'Unknown',
      status: tracking.status,
      currentStatus: tracking.shipment?.currentStatus,
      currentLocation: tracking.shipment?.currentLocation,
      expectedDeliveryDate: tracking.shipment?.expectedDeliveryDate,
      shippedDate: tracking.shipment?.shippedDate,
      metadata: tracking.metadata,
      createdAt: tracking.createdAt,
      updatedAt: tracking.updatedAt
    }));

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value || '').replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="trackings-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    } else {
      // Default to JSON
      res.json({
        data: exportData,
        metadata: {
          total: exportData.length,
          exportedAt: new Date().toISOString(),
          filters: {
            status: status || null,
            carrier: carrier || null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        }
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
