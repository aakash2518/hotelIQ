import cron from 'node-cron';
import prisma from './db/setup';
import { logger } from '@hoteliq/observability';
import { updateAgentContext } from '@hoteliq/agents';
import CONSTANTS from './constants';

interface MockMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

/**
 * Generates realistic mock campaign metrics using limits defined in CONSTANTS.
 */
function generateMockMetrics(): MockMetrics {
  const m = CONSTANTS.MOCK_METRICS;
  const sent = Math.floor(Math.random() * (m.SENT_MAX - m.SENT_MIN + 1)) + m.SENT_MIN;
  
  const openRate = Math.random() * (m.OPEN_RATE_MAX - m.OPEN_RATE_MIN) + m.OPEN_RATE_MIN;
  const clickRate = Math.random() * (m.CLICK_RATE_MAX - m.CLICK_RATE_MIN) + m.CLICK_RATE_MIN;
  const convertRate = Math.random() * (m.CONVERT_RATE_MAX - m.CONVERT_RATE_MIN) + m.CONVERT_RATE_MIN;

  const opened = Math.floor(sent * openRate);
  const clicked = Math.floor(opened * clickRate);
  const converted = Math.floor(clicked * convertRate);

  return { sent, opened, clicked, converted };
}

/**
 * Fetches active campaigns that are older than the threshold age and simulates their feedback metrics,
 * triggering the AI agent feedback loops.
 */
async function processCampaignFeedback(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('Starting campaign feedback loop cron job');

    // Fetch active campaigns older than MAX_CAMPAIGN_AGE_HOURS
    const ageThreshold = new Date(Date.now() - CONSTANTS.MAX_CAMPAIGN_AGE_HOURS * 60 * 60 * 1000);
    
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'active',
        createdAt: {
          lt: ageThreshold,
        },
        metrics: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          equals: prisma.campaign.fields.metrics as any
        },
      },
    });

    logger.info({ count: activeCampaigns.length }, 'Found active campaigns for feedback processing');

    let processedCount = 0;
    let errorCount = 0;

    for (const campaign of activeCampaigns) {
      try {
        // Generate mock metrics for demo
        const mockMetrics = generateMockMetrics();

        logger.info(
          {
            campaignId: campaign.id,
            campaignName: campaign.name,
            metrics: mockMetrics,
          },
          'Generating mock metrics for campaign'
        );

        // Call the feedback loop function
        await updateAgentContext(prisma, campaign.id, mockMetrics);

        processedCount++;

        logger.info(
          {
            campaignId: campaign.id,
            metrics: mockMetrics,
          },
          'Campaign feedback processed successfully'
        );

        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        errorCount++;
        logger.error(
          {
            error,
            campaignId: campaign.id,
            campaignName: campaign.name,
          },
          'Failed to process campaign feedback'
        );
      }
    }

    const duration = Date.now() - startTime;

    // Log job completion summary
    logger.info(
      {
        totalCampaigns: activeCampaigns.length,
        processedCount,
        errorCount,
        durationMs: duration,
        jobType: 'campaign_feedback_loop',
      },
      'Campaign feedback loop cron job completed'
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(
      {
        error,
        durationMs: duration,
        jobType: 'campaign_feedback_loop',
      },
      'Campaign feedback loop cron job failed'
    );
  }
}

/**
 * Initializes and schedules all cron jobs for the backend server.
 */
export function startCronJobs(): void {
  logger.info('Starting cron jobs');

  // Schedule campaign feedback loop based on CONSTANTS
  cron.schedule(CONSTANTS.FEEDBACK_LOOP_INTERVAL, async () => {
    await processCampaignFeedback();
  }, {
    timezone: 'UTC',
  });

  // Schedule daily cleanup at midnight UTC
  cron.schedule('0 0 * * *', () => {
    logger.info('Running daily cleanup tasks');
  }, {
    timezone: 'UTC',
  });

  logger.info('Cron jobs scheduled successfully');
}

/**
 * Manually triggers the campaign feedback loop (e.g. via API/test scripts).
 */
export async function triggerFeedbackLoop(): Promise<{ processed: number; errors: number }> {
  const startTime = Date.now();
  
  try {
    // For manual trigger, process all active campaigns regardless of age
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'active',
      },
    });

    let processedCount = 0;
    let errorCount = 0;

    for (const campaign of activeCampaigns) {
      try {
        const mockMetrics = generateMockMetrics();
        await updateAgentContext(prisma, campaign.id, mockMetrics);
        processedCount++;
      } catch (error) {
        errorCount++;
        logger.error({ error, campaignId: campaign.id }, 'Manual campaign feedback failed');
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ durationMs: duration, processedCount, errorCount }, 'Manual feedback loop trigger completed');
    return { processed: processedCount, errors: errorCount };
  } catch (error) {
    logger.error({ error }, 'Manual feedback loop trigger failed');
    return { processed: 0, errors: 1 };
  }
}