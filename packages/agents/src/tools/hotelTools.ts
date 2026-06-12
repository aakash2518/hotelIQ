import { PrismaClient } from '../types/prisma';
import { logger } from '@hoteliq/observability';

export class HotelTools {
  constructor(private prisma: PrismaClient) {}

  async getTopDestinations(): Promise<
    Array<{ city: string; priceDropPct: number; avgPrice: number }>
  > {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      // Get all hotels with their prices
      const hotels = await this.prisma.hotel.findMany({
        include: {
          prices: {
            where: {
              recordedAt: { gte: sixtyDaysAgo },
            },
          },
        },
      });

      // Calculate price drops by city
      const cityStats: Record<
        string,
        { recent: number[]; older: number[]; city: string }
      > = {};

      for (const hotel of hotels) {
        if (!cityStats[hotel.city]) {
          cityStats[hotel.city] = { recent: [], older: [], city: hotel.city };
        }

        for (const price of hotel.prices) {
          if (price.recordedAt >= thirtyDaysAgo) {
            cityStats[hotel.city].recent.push(price.priceUSD);
          } else {
            cityStats[hotel.city].older.push(price.priceUSD);
          }
        }
      }

      // Calculate averages and drops
      const destinations = Object.values(cityStats)
        .filter((stat) => stat.recent.length > 0 && stat.older.length > 0)
        .map((stat) => {
          const recentAvg = stat.recent.reduce((a, b) => a + b, 0) / stat.recent.length;
          const olderAvg = stat.older.reduce((a, b) => a + b, 0) / stat.older.length;
          const priceDropPct = ((olderAvg - recentAvg) / olderAvg) * 100;

          return {
            city: stat.city,
            priceDropPct: Math.round(priceDropPct * 100) / 100,
            avgPrice: Math.round(recentAvg * 100) / 100,
          };
        })
        .sort((a, b) => b.priceDropPct - a.priceDropPct)
        .slice(0, 5);

      logger.info({ count: destinations.length }, 'Retrieved top destinations');
      return destinations;
    } catch (error) {
      logger.error({ error }, 'Failed to get top destinations');
      throw error;
    }
  }

  async getPriceAnomalies(): Promise<
    Array<{ hotelId: string; hotelName: string; city: string; currentPrice: number; avgPrice: number; dropPct: number }>
  > {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const hotels = await this.prisma.hotel.findMany({
        include: {
          prices: {
            orderBy: { recordedAt: 'desc' },
          },
        },
      });

      const anomalies = [];

      for (const hotel of hotels) {
        if (hotel.prices.length === 0) continue;

        const currentPrice = hotel.prices[0].priceUSD;
        const recentPrices = hotel.prices
          .filter((p: any) => p.recordedAt >= thirtyDaysAgo)
          .map((p: any) => p.priceUSD);

        if (recentPrices.length < 2) continue;

        const avgPrice = recentPrices.reduce((a: number, b: number) => a + b, 0) / recentPrices.length;
        const dropPct = ((avgPrice - currentPrice) / avgPrice) * 100;

        if (dropPct >= 20) {
          anomalies.push({
            hotelId: hotel.id,
            hotelName: hotel.name,
            city: hotel.city,
            currentPrice: Math.round(currentPrice * 100) / 100,
            avgPrice: Math.round(avgPrice * 100) / 100,
            dropPct: Math.round(dropPct * 100) / 100,
          });
        }
      }

      logger.info({ count: anomalies.length }, 'Found price anomalies');
      return anomalies.slice(0, 10);
    } catch (error) {
      logger.error({ error }, 'Failed to get price anomalies');
      throw error;
    }
  }

  async getSeasonalTrends(): Promise<
    Array<{ city: string; month: string; avgPrice: number; changeFromPrevious: number }>
  > {
    try {
      const hotels = await this.prisma.hotel.findMany({
        include: {
          prices: {
            orderBy: { recordedAt: 'desc' },
            take: 200,
          },
        },
      });

      const monthlyData: Record<string, Record<string, number[]>> = {};

      for (const hotel of hotels) {
        for (const price of hotel.prices) {
          const monthKey = price.recordedAt.toISOString().slice(0, 7); // YYYY-MM
          
          if (!monthlyData[hotel.city]) {
            monthlyData[hotel.city] = {};
          }
          if (!monthlyData[hotel.city][monthKey]) {
            monthlyData[hotel.city][monthKey] = [];
          }

          monthlyData[hotel.city][monthKey].push(price.priceUSD);
        }
      }

      const trends = [];

      for (const [city, months] of Object.entries(monthlyData)) {
        const sortedMonths = Object.keys(months).sort();
        
        for (let i = 0; i < sortedMonths.length; i++) {
          const month = sortedMonths[i];
          const prices = months[month];
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

          let changeFromPrevious = 0;
          if (i > 0) {
            const prevMonth = sortedMonths[i - 1];
            const prevPrices = months[prevMonth];
            const prevAvgPrice = prevPrices.reduce((a, b) => a + b, 0) / prevPrices.length;
            changeFromPrevious = ((avgPrice - prevAvgPrice) / prevAvgPrice) * 100;
          }

          trends.push({
            city,
            month,
            avgPrice: Math.round(avgPrice * 100) / 100,
            changeFromPrevious: Math.round(changeFromPrevious * 100) / 100,
          });
        }
      }

      logger.info({ count: trends.length }, 'Retrieved seasonal trends');
      return trends.slice(0, 20);
    } catch (error) {
      logger.error({ error }, 'Failed to get seasonal trends');
      throw error;
    }
  }

  async getHistoricalCampaignPerformance(): Promise<
    Array<{
      channel: string;
      segment: string;
      avgCTR: number;
      avgConversion: number;
      campaignCount: number;
    }>
  > {
    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'completed',
          metrics: { not: null },
        },
      });

      const performance: Record<string, {
        sent: number;
        clicked: number;
        converted: number;
        count: number;
      }> = {};

      for (const campaign of campaigns) {
        const metrics = campaign.metrics as any;
        if (!metrics || !metrics.sent) continue;

        const key = `${campaign.channel}_${campaign.targetSegment}`;
        
        if (!performance[key]) {
          performance[key] = { sent: 0, clicked: 0, converted: 0, count: 0 };
        }

        performance[key].sent += metrics.sent || 0;
        performance[key].clicked += metrics.clicked || 0;
        performance[key].converted += metrics.converted || 0;
        performance[key].count += 1;
      }

      const results = Object.entries(performance).map(([key, data]) => {
        const [channel, segment] = key.split('_');
        const avgCTR = data.sent > 0 ? (data.clicked / data.sent) * 100 : 0;
        const avgConversion = data.clicked > 0 ? (data.converted / data.clicked) * 100 : 0;

        return {
          channel,
          segment,
          avgCTR: Math.round(avgCTR * 100) / 100,
          avgConversion: Math.round(avgConversion * 100) / 100,
          campaignCount: data.count,
        };
      });

      logger.info({ count: results.length }, 'Retrieved historical campaign performance');
      return results;
    } catch (error) {
      logger.error({ error }, 'Failed to get historical campaign performance');
      throw error;
    }
  }

  async getBestSegmentForCity(city: string): Promise<{ segment: string; confidence: number }> {
    try {
      const hotels = await this.prisma.hotel.findMany({
        where: { city },
        include: {
          prices: {
            orderBy: { recordedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (hotels.length === 0) {
        return { segment: 'family', confidence: 0.5 };
      }

      // Calculate average price to determine segment
      let totalAvgPrice = 0;
      let hotelCount = 0;

      for (const hotel of hotels) {
        if (hotel.prices.length > 0) {
          const avgPrice = hotel.prices.reduce((a: number, b: any) => a + b.priceUSD, 0) / hotel.prices.length;
          totalAvgPrice += avgPrice;
          hotelCount++;
        }
      }

      const cityAvgPrice = hotelCount > 0 ? totalAvgPrice / hotelCount : 200;

      let segment: string;
      let confidence: number;

      if (cityAvgPrice < 150) {
        segment = 'budget';
        confidence = 0.85;
      } else if (cityAvgPrice > 350) {
        segment = 'luxury';
        confidence = 0.9;
      } else {
        segment = 'family';
        confidence = 0.75;
      }

      logger.info({ city, segment, cityAvgPrice, confidence }, 'Determined best segment for city');
      return { segment, confidence };
    } catch (error) {
      logger.error({ error, city }, 'Failed to get best segment for city');
      throw error;
    }
  }

  async calculateCampaignROI(channel: string, segment: string): Promise<{ expectedROI: number; expectedCTR: number }> {
    try {
      const performance = await this.getHistoricalCampaignPerformance();
      
      const match = performance.find(
        (p) => p.channel === channel && p.segment === segment
      );

      if (match) {
        // Calculate ROI based on historical conversion rates
        const expectedROI = (match.avgConversion / 100) * 50; // Simplified ROI calculation
        return {
          expectedROI: Math.round(expectedROI * 100) / 100,
          expectedCTR: match.avgCTR,
        };
      }

      // Default estimates if no historical data
      const defaultCTR: Record<string, number> = {
        email: 8.5,
        push: 4.2,
        sms: 12.0,
      };

      return {
        expectedROI: 2.5,
        expectedCTR: defaultCTR[channel] || 5.0,
      };
    } catch (error) {
      logger.error({ error, channel, segment }, 'Failed to calculate campaign ROI');
      throw error;
    }
  }
}
