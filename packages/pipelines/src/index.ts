export { HotelPriceProducer } from './producer';
export { HotelPriceConsumer } from './consumer';
export { HotelETLPipeline } from './etl';

// Legacy export for backward compatibility
import { logger } from '@hoteliq/observability';

export class DataPipeline {
  constructor() {
    logger.info('Data pipeline initialized');
  }

  async ingest(source: string, data: unknown): Promise<void> {
    logger.info({ source }, 'Ingesting data from source');
    // ETL logic here
    logger.info({ source, dataSize: JSON.stringify(data).length }, 'Data ingested successfully');
  }

  async transform(data: unknown): Promise<unknown> {
    logger.info('Transforming data');
    // Transform logic here
    return data;
  }
}

export default DataPipeline;
