// TODO: Prisma client needs to be generated - using mock for now
// import { PrismaClient } from '@prisma/client';
import { logger } from '@hoteliq/observability';

export class HotelETLPipeline {
  private prisma: any; // Mock until PrismaClient is available

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async processHotelData(): Promise<{ processed: number; errors: number }> {
    const startTime = Date.now();
    let processed = 0;
    let errors = 0;

    try {
      logger.info('Starting hotel ETL pipeline');

      // Fetch all hotels with their prices
      const hotels = await this.prisma.hotel.findMany({
        include: {
          prices: {
            orderBy: { recordedAt: 'desc' },
          },
        },
      });

      logger.info({ count: hotels.length }, 'Fetched hotels for processing');

      for (const hotel of hotels) {
        try {
          if (hotel.prices.length === 0) {
            logger.warn({ hotelId: hotel.id }, 'Hotel has no prices, skipping');
            continue;
          }

          // Calculate price statistics
          const prices = hotel.prices.map((p: any) => p.priceUSD);
          const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);

          // Get unique sources
          const sources = [...new Set(hotel.prices.map((p: any) => p.source))].join(', ');

          // Get latest update
          const latestUpdate = hotel.prices[0].recordedAt;

          // Create text summary
          const textContent = `Hotel: ${hotel.name}, City: ${hotel.city}, Country: ${hotel.country}, Stars: ${hotel.starRating}, Average Price: $${avgPrice.toFixed(2)}, Price Range: $${minPrice.toFixed(2)}-$${maxPrice.toFixed(2)}, Sources: ${sources}, Last Updated: ${latestUpdate.toISOString().split('T')[0]}`;

          // Check if embedding already exists
          const existingEmbedding = await this.prisma.hotelEmbedding.findFirst({
            where: { hotelId: hotel.id },
          });

          if (existingEmbedding) {
            // Update existing
            await this.prisma.hotelEmbedding.update({
              where: { id: existingEmbedding.id },
              data: { textContent },
            });
          } else {
            // Create new (embedding field left as null for now)
            await this.prisma.hotelEmbedding.create({
              data: {
                hotelId: hotel.id,
                textContent,
                embedding: [], // Empty array - will be filled with OpenAI embeddings later
              },
            });
          }

          processed++;
          logger.info(
            { hotelId: hotel.id, hotelName: hotel.name },
            'Hotel data processed'
          );
        } catch (error) {
          errors++;
          logger.error({ error, hotelId: hotel.id }, 'Failed to process hotel');
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        { processed, errors, durationMs: duration },
        'ETL pipeline completed'
      );

      return { processed, errors };
    } catch (error) {
      logger.error({ error }, 'ETL pipeline failed');
      throw error;
    }
  }
}

export default HotelETLPipeline;
