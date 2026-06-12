import { Router, Request, Response } from 'express';
import prisma from '../db/setup';
import { logger } from '@hoteliq/observability';
import { HotelETLPipeline } from '@hoteliq/pipelines';
import { embedAllHotels } from '@hoteliq/agents';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

/**
 * POST /api/pipelines/etl
 * Trigger the hotel data ingestion ETL pipeline from external sources into PostgreSQL.
 * Returns: { success: true, data: ETLResult }
 */
router.post('/etl', async (_req: Request, res: Response) => {
  try {
    logger.info('ETL pipeline triggered via API');

    const etl = new HotelETLPipeline(prisma);
    const result = await etl.processHotelData();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ error }, 'ETL pipeline failed');
    res.status(500).json({
      success: false,
      error: 'ETL pipeline failed',
      code: 'ETL_PIPELINE_FAILED'
    });
  }
});

/**
 * POST /api/pipelines/seed
 * Force a database seed run to reset sample data.
 * Returns: { success: true, data: { output: string }, meta: { message: string } }
 */
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    logger.info('Data seeder triggered via API');

    // Run the seed script
    const { stdout, stderr } = await execAsync('npx prisma db seed', {
      cwd: process.cwd(),
    });

    if (stderr) {
      logger.warn({ stderr }, 'Seed script produced warnings');
    }

    logger.info({ stdout }, 'Data seeder completed');

    res.json({
      success: true,
      data: { output: stdout },
      meta: { message: 'Database seeded successfully' }
    });
  } catch (error) {
    logger.error({ error }, 'Data seeder failed');
    res.status(500).json({
      success: false,
      error: 'Data seeder failed',
      code: 'SEED_FAILED'
    });
  }
});

/**
 * POST /api/pipelines/embed
 * Run the text-to-vector embedding pipeline on all pre-seeded hotel records.
 * Returns: { success: true, data: EmbedResult }
 */
router.post('/embed', async (_req: Request, res: Response) => {
  try {
    logger.info('Embedding generation triggered via API');

    const result = await embedAllHotels(prisma);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ error }, 'Embedding generation failed');
    res.status(500).json({
      success: false,
      error: 'Embedding generation failed',
      code: 'EMBEDDING_FAILED'
    });
  }
});

export default router;

