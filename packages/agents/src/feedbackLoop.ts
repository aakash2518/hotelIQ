import { PrismaClient } from './types/prisma';
import { logger } from '@hoteliq/observability';

export interface CampaignMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export async function updateAgentContext(
  prisma: PrismaClient,
  campaignId: string,
  metrics: CampaignMetrics
): Promise<void> {
  try {
    logger.info({ campaignId, metrics }, 'Updating agent context with campaign results');

    // Fetch the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      logger.error({ campaignId }, 'Campaign not found');
      throw new Error('Campaign not found');
    }

    // Calculate actual performance
    const actualCTR = metrics.sent > 0 ? (metrics.clicked / metrics.sent) * 100 : 0;
    const actualConversion = metrics.clicked > 0 ? (metrics.converted / metrics.clicked) * 100 : 0;

    // Get expected CTR from agent decision
    const agentDecision = campaign.agentDecision as any;
    const expectedCTR = agentDecision?.expectedCTR || 0;

    // Calculate performance delta
    const ctrDelta = actualCTR - expectedCTR;
    const ctrDeltaPct = expectedCTR > 0 ? (ctrDelta / expectedCTR) * 100 : 0;

    // Check if actual CTR is significantly below expected (20%+ worse)
    if (ctrDeltaPct < -20) {
      logger.warn(
        {
          campaignId,
          expectedCTR,
          actualCTR,
          ctrDeltaPct,
          city: campaign.targetCity,
          channel: campaign.channel,
          segment: campaign.targetSegment,
        },
        'Campaign underperformed: actual CTR is 20%+ below expected'
      );

      // Log warning to AgentLog
      await prisma.agentLog.create({
        data: {
          agentName: 'feedback',
          action: 'performance_warning',
          input: {
            campaignId,
            expectedCTR,
            actualCTR,
          },
          output: {
            warning: 'underperformance',
            ctrDeltaPct,
            recommendation: `Review ${campaign.channel} effectiveness for ${campaign.targetSegment} segment in ${campaign.targetCity}`,
          },
          latencyMs: 0,
          confidence: 1.0,
        },
      });
    } else {
      logger.info(
        {
          campaignId,
          expectedCTR,
          actualCTR,
          ctrDeltaPct,
        },
        'Campaign performance within expected range'
      );
    }

    // Update campaign with metrics and performance delta
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        metrics,
        status: 'completed',
        agentDecision: {
          ...(agentDecision || {}),
          performanceDelta: {
            expectedCTR,
            actualCTR,
            ctrDeltaPct,
            actualConversion,
            metricsRecordedAt: new Date().toISOString(),
          },
        },
      },
    });

    // Log feedback loop completion
    await prisma.agentLog.create({
      data: {
        agentName: 'feedback',
        action: 'update_campaign_metrics',
        input: { campaignId, metrics },
        output: {
          actualCTR,
          actualConversion,
          ctrDeltaPct,
          status: ctrDeltaPct < -20 ? 'underperformed' : 'on_target',
        },
        latencyMs: 0,
        confidence: 1.0,
      },
    });

    logger.info({ campaignId, actualCTR, ctrDeltaPct }, 'Agent context updated successfully');
  } catch (error) {
    logger.error({ error, campaignId }, 'Failed to update agent context');
    throw error;
  }
}
