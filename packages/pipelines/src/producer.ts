import { Kafka, Producer } from 'kafkajs';
import { logger } from '@hoteliq/observability';

export class HotelPriceProducer {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(brokers: string[]) {
    this.kafka = new Kafka({
      clientId: 'hoteliq-producer',
      brokers,
    });
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka producer connected');
    } catch (error) {
      logger.error({ error }, 'Failed to connect Kafka producer');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka producer disconnected');
    }
  }

  async produceHotelPriceUpdate(message: {
    hotelId: string;
    source: string;
    priceUSD: number;
    checkIn: Date;
    checkOut: Date;
    recordedAt: Date;
  }): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Producer not connected');
    }

    try {
      await this.producer.send({
        topic: 'hotel-price-updates',
        messages: [
          {
            key: message.hotelId,
            value: JSON.stringify({
              ...message,
              checkIn: message.checkIn.toISOString(),
              checkOut: message.checkOut.toISOString(),
              recordedAt: message.recordedAt.toISOString(),
            }),
          },
        ],
      });

      logger.info(
        {
          hotelId: message.hotelId,
          source: message.source,
          priceUSD: message.priceUSD,
        },
        'Hotel price update produced'
      );
    } catch (error) {
      logger.error({ error, message }, 'Failed to produce message');
      throw error;
    }
  }

  async startMockStream(intervalMs = 3000): Promise<void> {
    const sources = ['booking.com', 'expedia', 'hotels.com'];
    const mockHotelIds = [
      'hotel_001',
      'hotel_002',
      'hotel_003',
      'hotel_004',
      'hotel_005',
    ];

    logger.info({ intervalMs }, 'Starting mock price stream');

    const interval = setInterval(async () => {
      const hotelId = mockHotelIds[Math.floor(Math.random() * mockHotelIds.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const priceUSD = Math.floor(Math.random() * 500) + 100;
      const now = new Date();
      const checkIn = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000);

      try {
        await this.produceHotelPriceUpdate({
          hotelId,
          source,
          priceUSD,
          checkIn,
          checkOut,
          recordedAt: now,
        });
      } catch (error) {
        logger.error({ error }, 'Error in mock stream');
      }
    }, intervalMs);

    // Store interval for cleanup
    (this as any).streamInterval = interval;
  }

  stopMockStream(): void {
    const interval = (this as any).streamInterval;
    if (interval) {
      clearInterval(interval);
      logger.info('Mock price stream stopped');
    }
  }
}

export default HotelPriceProducer;
