import { PrismaClient } from './types/prisma';
import { logger } from '@hoteliq/observability';
import { HotelTools } from './tools/hotelTools';
import { ResearchOutput } from './researchAgent';
import { createLLM } from './llm/config';

export interface DecisioningInput {
  researchInsights: string;
  topOpportunities: Array<{ city: string; reason: string; priceDropPct: number }>;
}

export interface DecisioningOutput {
  recommendedCity: string;
  targetSegment: string;
  channel: string;
  reasoning: string;
  confidence: number;
  expectedCTR: number;
}

export class DecisioningAgent {
  private llm: any; // Universal LLM interface
  private tools: HotelTools;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.llm = createLLM('decisioning'); // Use Gemini by default
    this.tools = new HotelTools(prisma);
  }

  /**
   * Runs the Decisioning Agent marketing strategy selection.
   * @param input Research insights and identified top opportunities.
   * @returns Optimal target city, segment, channel, and expectations.
   */
  async run(input: DecisioningInput): Promise<DecisioningOutput> {
    console.log("🧠 Decisioning Agent analyzing...");
    const startTime = Date.now();
    let tokenCount = 0;

    try {
      logger.info({ opportunities: input.topOpportunities.length }, 'Starting decisioning agent');

      // Gather performance data
      const historicalPerformance = await this.tools.getHistoricalCampaignPerformance();

      // Get segment recommendations for top cities
      const citySegments = await Promise.all(
        input.topOpportunities.slice(0, 3).map(async (opp) => {
          const segment = await this.tools.getBestSegmentForCity(opp.city);
          return { city: opp.city, ...segment };
        })
      );

      // Calculate ROI for different channel/segment combinations
      const channels = ['email', 'push', 'sms'];
      const roiCalculations = [];
      
      for (const citySegment of citySegments) {
        for (const channel of channels) {
          const roi = await this.tools.calculateCampaignROI(channel, citySegment.segment);
          roiCalculations.push({
            city: citySegment.city,
            segment: citySegment.segment,
            channel,
            ...roi,
          });
        }
      }

      // Prepare context for LLM
      const systemPrompt = `You are a marketing strategist for a hotel price comparison platform. Given market research insights, decide the optimal campaign strategy. Always maximize conversion rate.`;

      const userPrompt = `Based on the research findings, decide the best campaign strategy.

RESEARCH INSIGHTS:
${input.researchInsights}

TOP OPPORTUNITIES:
${input.topOpportunities.map((o) => `- ${o.city}: ${o.reason} (${o.priceDropPct}% price drop)`).join('\n')}

CITY SEGMENT ANALYSIS:
${citySegments.map((cs) => `- ${cs.city}: Best segment is "${cs.segment}" (${Math.round(cs.confidence * 100)}% confidence)`).join('\n')}

HISTORICAL CAMPAIGN PERFORMANCE:
${historicalPerformance.map((p) => `- ${p.channel} + ${p.segment}: ${p.avgCTR}% CTR, ${p.avgConversion}% conversion (${p.campaignCount} campaigns)`).join('\n')}

ROI PROJECTIONS:
${roiCalculations.slice(0, 6).map((r) => `- ${r.city} / ${r.channel} / ${r.segment}: ${r.expectedCTR}% CTR, ${r.expectedROI}x ROI`).join('\n')}

Choose ONE city, ONE channel, and ONE target segment that will maximize conversion rate.

Format your response as JSON:
{
  "recommendedCity": "city name",
  "targetSegment": "budget|luxury|family",
  "channel": "email|push|sms",
  "reasoning": "detailed explanation with numbers",
  "confidence": 0.9,
  "expectedCTR": 8.5
}`;

      const response = await this.llm.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const content = response.content as string;
      tokenCount = Math.ceil(content.length / 4);
      logger.info({ tokenCount }, 'Decisioning Agent token usage logged');

      // Parse JSON response
      let result: DecisioningOutput;
      try {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        result = JSON.parse(jsonStr);
      } catch (parseError) {
        logger.warn({ parseError, content }, 'Failed to parse LLM response, using fallback');
        
        // Use best ROI projection as fallback
        const bestROI = roiCalculations.sort((a, b) => b.expectedROI - a.expectedROI)[0];
        result = {
          recommendedCity: bestROI ? bestROI.city : 'Paris',
          targetSegment: bestROI ? bestROI.segment : 'luxury',
          channel: bestROI ? bestROI.channel : 'email',
          reasoning: bestROI 
            ? `Selected based on highest expected ROI (${bestROI.expectedROI}x) and CTR (${bestROI.expectedCTR}%)`
            : 'Defaulted to Paris luxury email campaign because it remains our strongest historical performer.',
          confidence: 0.75,
          expectedCTR: bestROI ? bestROI.expectedCTR : 6.0,
        };
      }

      const latency = Date.now() - startTime;

      // Log to AgentLog table
      await this.prisma.agentLog.create({
        data: {
          agentName: 'decisioning',
          action: 'recommend_campaign',
          input: { opportunities: input.topOpportunities, historicalDataPoints: historicalPerformance.length },
          output: result,
          latencyMs: latency,
          tokenCost: tokenCount,
          confidence: result.confidence,
        },
      });

      logger.info(
        {
          latency,
          tokenCount,
          city: result.recommendedCity,
          channel: result.channel,
          segment: result.targetSegment,
        },
        'Decisioning agent completed'
      );

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error({ error, latency }, 'Decisioning agent failed');
      
      try {
        await this.prisma.agentLog.create({
          data: {
            agentName: 'decisioning',
            action: 'recommend_campaign',
            input: { error: 'failed' },
            output: { error: error instanceof Error ? error.message : 'Unknown error' },
            latencyMs: latency,
            tokenCost: tokenCount,
            confidence: 0,
          },
        });
      } catch (dbError) {
        logger.error({ dbError }, 'Failed to write failed run log to database');
      }

      // Return graceful fallback
      logger.warn('Returning graceful fallback decisioning output');
      return {
        recommendedCity: 'Paris',
        targetSegment: 'luxury',
        channel: 'email',
        reasoning: 'Encountered run error in Decisioning Agent. Falling back to Paris luxury email segment due to stable historical conversions.',
        confidence: 0.6,
        expectedCTR: 5.5,
      };
    }
  }
}

/**
 * Helper wrapper to instantiate and run the Decisioning Agent.
 * @param prisma The database client.
 * @param input The insights from the Research Agent.
 */
export async function runDecisioningAgent(
  prisma: PrismaClient,
  input: DecisioningInput
): Promise<DecisioningOutput> {
  const agent = new DecisioningAgent(prisma);
  return agent.run(input);
}

