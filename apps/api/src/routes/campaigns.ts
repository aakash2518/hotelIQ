import { Router, Request, Response } from 'express';
import prisma from '../db/setup';
import { logger } from '@hoteliq/observability';

const router = Router();

/**
 * GET /api/campaigns
 * Retrieve all pre-seeded and generated campaigns, ordered by creation date descending.
 * Returns: { success: true, data: Array<Campaign> }
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
    });

    logger.info({ count: campaigns.length }, 'Fetched campaigns list');
    
    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch campaigns');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      code: 'FETCH_CAMPAIGNS_ERROR'
    });
  }
});

export default router;