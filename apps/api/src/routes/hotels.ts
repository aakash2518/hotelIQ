import { Router, Request, Response } from 'express';
import prisma from '../db/setup';
import { logger } from '@hoteliq/observability';

const router = Router();

/**
 * GET /api/hotels
 * Retrieve all hotels, including their latest price record.
 * Returns: { success: true, data: Array<Hotel> }
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const hotels = await prisma.hotel.findMany({
      include: {
        prices: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    const hotelsWithLatestPrice = hotels.map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      country: hotel.country,
      starRating: hotel.starRating,
      createdAt: hotel.createdAt,
      latestPrice: hotel.prices[0] || null,
    }));

    logger.info({ count: hotelsWithLatestPrice.length }, 'Fetched hotels list');
    
    res.json({
      success: true,
      data: hotelsWithLatestPrice
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch hotels');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotels',
      code: 'FETCH_HOTELS_ERROR'
    });
  }
});

/**
 * GET /api/hotels/:id
 * Retrieve details for a single hotel, including its full price history and text embeddings.
 * Returns: { success: true, data: Hotel }
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        prices: {
          orderBy: { recordedAt: 'desc' },
        },
        embeddings: true,
      },
    });

    if (!hotel) {
      logger.warn({ hotelId: id }, 'Hotel not found');
      return res.status(404).json({
        success: false,
        error: 'Hotel not found',
        code: 'HOTEL_NOT_FOUND'
      });
    }

    logger.info({ hotelId: id, priceCount: hotel.prices.length }, 'Fetched hotel details');
    
    res.json({
      success: true,
      data: hotel
    });
  } catch (error) {
    logger.error({ error, hotelId: req.params.id }, 'Failed to fetch hotel');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotel details',
      code: 'FETCH_HOTEL_DETAIL_ERROR'
    });
  }
});

export default router;