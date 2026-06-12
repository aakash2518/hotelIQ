import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
// TODO: Prisma client needs to be generated - using mock for now
// import { PrismaClient } from '@prisma/client';
import { logger } from '@hoteliq/observability';

export class HotelPriceConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private prisma: any; // Mock until PrismaClient is available
  private isConnected = false;

  constructor(brokers: string[], prisma: any) {
    this.kafka = new Kafka({
      clientId: 'hoteliq-consumer',
      brokers,
    });
    this.consumer = this.kafka.consumer({ groupId: 'hotel-price-consumer-group' });
    this.prisma = prisma;
  }

  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: 'hotel-price-updates', fromBeginning: true });
      this.isConnected = true;
      logger.info('Kafka consumer connected and subscribed to hotel-price-updates');
    } catch (error) {
      logger.error({ error }, 'Failed to connect Kafka consumer');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka consumer disconnected');
    }
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const startTime = Date.now();
    const { message } = payload;

    try {
      if (!message.value) {
        logger.warn('Received message with no value');
        return;
      }

      const data = JSON.parse(message.value.toString());

      // Validate required fields
      if (!data.hotelId || !data.source || !data.priceUSD) {
        logger.error({ data }, 'Invalid message format - missing required fields');
        return;
      }

      // Transform and save to PostgreSQL
      await this.prisma.hotelPrice.create({
        data: {
          hotelId: data.hotelId,
          source: data.source,
          priceUSD: parseFloat(data.priceUSD),
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
        },
      });

      const latency = Date.now() - startTime;
      logger.info(
        {
          hotelId: data.hotelId,
          source: data.source,
          priceUSD: data.priceUSD,
          latencyMs: latency,
        },
        'Price update processed and saved'
      );
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(
        {
          error,
          message: message.value?.toString(),
          latencyMs: latency,
          partition: payload.partition,
          offset: message.offset,
        },
        'Failed to process message'
      );
      // DO NOT crash - log and continue
    }
  }

  async start(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Consumer not connected');
    }

    logger.info('Starting Kafka consumer...');

    await this.consumer.run({
      eachMessage: async (payload) => {
        await this.processMessage(payload);
      },
    });
  }
}

export default HotelPriceConsumer;
