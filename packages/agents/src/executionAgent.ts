import { PrismaClient } from './types/prisma';
import { logger } from '@hoteliq/observability';
import { DecisioningOutput } from './decisioningAgent';
import { createLLM } from './llm/config';

export interface ExecutionInput {
  decision: DecisioningOutput;
}

export interface ExecutionOutput {
  channel: string;
  content: string;
  subject?: string;
  campaignId: string;
}

export class ExecutionAgent {
  private llm: any; // Universal LLM interface
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.llm = createLLM('execution'); // Use Gemini by default
  }

  private async generateEmailContent(
    city: string,
    segment: string,
    priceDropPct: number
  ): Promise<{ subject: string; body: string }> {
    const prompt = `Generate a compelling email campaign for ${segment} travelers interested in ${city}. 
Highlight that prices have dropped by ${priceDropPct}%. 
Create:
1. Subject line (max 60 characters, urgent and compelling)
2. Email body (3-4 sentences, include call-to-action)

Format as JSON: {"subject": "...", "body": "..."}`;

    const response = await this.llm.invoke(prompt);
    const content = response.content as string;
    
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      return JSON.parse(jsonStr);
    } catch {
      return {
        subject: `${priceDropPct}% Off Hotels in ${city} - Limited Time!`,
        body: `Great news! Hotel prices in ${city} have dropped by ${priceDropPct}%. Perfect for ${segment} travelers. Book now before prices go back up! View deals →`,
      };
    }
  }

  private async generatePushNotification(city: string, priceDropPct: number): Promise<string> {
    const prompt = `Generate a short push notification (max 100 characters) for ${city} hotels with ${priceDropPct}% price drop. Be urgent and specific.`;

    const response = await this.llm.invoke(prompt);
    const content = (response.content as string).replace(/["\n]/g, '').slice(0, 100);
    
    return content || `🔥 ${city} hotels ${priceDropPct}% off! Book now before it's gone!`;
  }

  private async generateSMSContent(city: string, priceDropPct: number): Promise<string> {
    const prompt = `Generate an SMS text (max 160 characters) for ${city} hotels with ${priceDropPct}% price drop. Include urgency and a call-to-action.`;

    const response = await this.llm.invoke(prompt);
    const content = (response.content as string).replace(/["\n]/g, '').slice(0, 160);
    
    return content || `${city} hotels are ${priceDropPct}% off today! Don't miss out. Book: hoteliq.com/${city.toLowerCase()}`;
  }

  private async saveCampaignToDB(
    decision: DecisioningOutput,
    content: string,
    subject?: string
  ): Promise<string> {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: `${decision.recommendedCity} ${decision.targetSegment} Campaign`,
        targetCity: decision.recommendedCity,
        targetSegment: decision.targetSegment,
        channel: decision.channel,
        content: subject ? `${subject}\n\n${content}` : content,
        status: 'active',
        agentDecision: {
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          expectedCTR: decision.expectedCTR,
        },
      },
    });

    logger.info({ campaignId: campaign.id, city: decision.recommendedCity }, 'Campaign saved to database');
    return campaign.id;
  }

  /**
   * Runs the Execution Agent content generation.
   * @param input Selected strategy including city, segment, and channel.
   * @returns Generated content details and saved campaign ID.
   */
  async run(input: ExecutionInput): Promise<ExecutionOutput> {
    console.log("✍️  Execution Agent generating content...");
    const startTime = Date.now();
    let tokenCount = 0;

    try {
      const { decision } = input;
      logger.info(
        { city: decision.recommendedCity, channel: decision.channel },
        'Starting execution agent'
      );

      // Get approximate price drop from opportunities (use confidence as proxy if not available)
      const priceDropPct = decision.confidence * 20; // Approximate based on confidence

      let content: string;
      let subject: string | undefined;

      // Generate content based on channel
      switch (decision.channel) {
        case 'email':
          const emailContent = await this.generateEmailContent(
            decision.recommendedCity,
            decision.targetSegment,
            priceDropPct
          );
          subject = emailContent.subject;
          content = emailContent.body;
          tokenCount += 100;
          break;

        case 'push':
          content = await this.generatePushNotification(decision.recommendedCity, priceDropPct);
          tokenCount += 50;
          break;

        case 'sms':
          content = await this.generateSMSContent(decision.recommendedCity, priceDropPct);
          tokenCount += 50;
          break;

        default:
          throw new Error(`Unknown channel: ${decision.channel}`);
      }

      logger.info({ tokenCount }, 'Execution Agent token usage logged');

      // Save campaign to database
      const campaignId = await this.saveCampaignToDB(decision, content, subject);

      const result: ExecutionOutput = {
        channel: decision.channel,
        content,
        subject,
        campaignId,
      };

      const latency = Date.now() - startTime;

      // Log to AgentLog table
      await this.prisma.agentLog.create({
        data: {
          agentName: 'execution',
          action: 'generate_campaign_content',
          input: { decision },
          output: { campaignId, channel: decision.channel, hasSubject: !!subject },
          latencyMs: latency,
          tokenCost: tokenCount,
          confidence: 1.0,
        },
      });

      logger.info(
        { latency, tokenCount, campaignId, channel: decision.channel },
        'Execution agent completed'
      );

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error({ error, latency }, 'Execution agent failed');
      
      try {
        await this.prisma.agentLog.create({
          data: {
            agentName: 'execution',
            action: 'generate_campaign_content',
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

      // Generate a mock campaign in database if possible, or return direct fallback
      let fallbackCampaignId = 'fallback-camp-id';
      try {
        const campaign = await this.prisma.campaign.create({
          data: {
            name: `${input.decision.recommendedCity} Fallback Campaign`,
            targetCity: input.decision.recommendedCity,
            targetSegment: input.decision.targetSegment,
            channel: input.decision.channel,
            content: `Great deals on hotels in ${input.decision.recommendedCity}! Book your next getaway today.`,
            status: 'active',
            agentDecision: {
              reasoning: 'Generated due to execution agent recovery fallback path.',
              confidence: 0.5,
              expectedCTR: 4.0,
            },
          },
        });
        fallbackCampaignId = campaign.id;
      } catch (dbError) {
        logger.error({ dbError }, 'Failed to create fallback campaign in database');
      }

      return {
        channel: input.decision.channel,
        content: `Discover amazing hotels in ${input.decision.recommendedCity}! Book your next getaway today.`,
        subject: `Special Offers for Hotels in ${input.decision.recommendedCity}`,
        campaignId: fallbackCampaignId,
      };
    }
  }
}

/**
 * Helper wrapper to instantiate and run the Execution Agent.
 * @param prisma The database client.
 * @param input Selected strategy configuration.
 */
export async function runExecutionAgent(
  prisma: PrismaClient,
  input: ExecutionInput
): Promise<ExecutionOutput> {
  const agent = new ExecutionAgent(prisma);
  return agent.run(input);
}

