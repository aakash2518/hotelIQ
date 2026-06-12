import express from 'express';
import dotenv from 'dotenv';
import { logger, tracerMiddleware } from '@hoteliq/observability';
import { setupDatabase } from './db/setup';
import { performanceBudget } from './middleware/budget';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { startCronJobs } from './cron';
import hotelsRouter from './routes/hotels';
import campaignsRouter from './routes/campaigns';
import pipelinesRouter from './routes/pipelines';
import agentsRouter from './routes/agents';
import flagsRouter from './routes/flags';
import healthRouter from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(tracerMiddleware);
app.use(performanceBudget);

// Health check route (root level /health)
app.use('/health', healthRouter);

// API Routes
app.use('/api/hotels', hotelsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/flags', flagsRouter);

// Global Error Handler - must be registered LAST
app.use(errorHandler);

/**
 * Initializes database configurations, registers cron jobs, and starts the API server.
 */
async function startServer() {
  try {
    // Setup database (enable pgvector extension)
    await setupDatabase();
    
    // Start cron jobs
    startCronJobs();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`API server running on port ${PORT}`);
      logger.info('Cron jobs started');
      logger.info('Observability middleware enabled');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

export default app;

