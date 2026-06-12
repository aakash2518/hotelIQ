import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '@hoteliq/observability';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hoteliq';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Initializes database extensions and setups the vector database configuration.
 */
export async function setupDatabase(): Promise<void> {
  try {
    logger.info('Setting up database extensions...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.warn(
      { error },
      'Database not reachable during startup — server will continue without DB. ' +
      'Wake up your Supabase project at https://supabase.com/dashboard and it will reconnect automatically.'
    );
    // Non-fatal: allow server to start so routes/health checks still work
  }
}

export default prisma;

