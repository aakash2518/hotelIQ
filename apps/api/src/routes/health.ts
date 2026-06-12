import { Router, Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import net from 'net';
import { URL } from 'url';
import prisma from '../db/setup';
import { logger } from '@hoteliq/observability';

const router = Router();

/**
 * Checks a TCP connection to verify if a service port is listening.
 * @param urlStr The connection URL to check.
 * @param defaultPort Default port if not present in the URL.
 */
function checkTCPConnection(urlStr: string, defaultPort: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Handle cases where scheme is missing
      const hasProtocol = urlStr.includes('://');
      const normalizedUrl = hasProtocol ? urlStr : `tcp://${urlStr}`;
      const parsed = new URL(normalizedUrl);
      
      const port = parsed.port ? parseInt(parsed.port) : defaultPort;
      const host = parsed.hostname || 'localhost';

      const socket = net.createConnection(port, host);
      socket.setTimeout(2000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', (err) => {
        logger.debug({ err, host, port }, 'TCP connection check failed');
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    } catch (err) {
      logger.debug({ err, urlStr }, 'Failed to parse connection URL for TCP check');
      resolve(false);
    }
  });
}

/**
 * GET /health
 * Performs real status checks for the Database, Kafka, and Redis services.
 * Database is required; Kafka and Redis are optional (dev environments may not have them).
 */
router.get('/', async (_req: Request, res: Response) => {
  const services: {
    database: 'connected' | 'error';
    kafka: 'connected' | 'error' | 'optional';
    redis: 'connected' | 'error' | 'optional';
  } = {
    database: 'error',
    kafka: 'optional',
    redis: 'optional',
  };

  // 1. Check Database (required)
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'connected';
  } catch (error) {
    logger.error({ error }, 'Health check database failure');
    services.database = 'error';
  }

  // 2. Check Kafka broker (optional — not required in dev)
  try {
    const brokers = [process.env.KAFKA_BROKER || 'localhost:9092'];
    const kafka = new Kafka({
      clientId: 'health-check',
      brokers,
      connectionTimeout: 2000,
    });
    const admin = kafka.admin();
    await admin.connect();
    await admin.disconnect();
    services.kafka = 'connected';
  } catch {
    // Kafka is optional — log at debug level only
    services.kafka = 'optional';
  }

  // 3. Check Redis URL (optional — not required in dev)
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const isRedisUp = await checkTCPConnection(redisUrl, 6379);
  services.redis = isRedisUp ? 'connected' : 'optional';

  // Only database is required for health
  const isHealthy = services.database === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    services,
    note: 'Kafka and Redis are optional in development mode',
    uptime: process.uptime(),
    version: '1.0.0',
  });
});


export default router;
