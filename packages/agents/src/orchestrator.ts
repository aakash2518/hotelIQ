import { PrismaClient } from './types/prisma';
import { logger } from '@hoteliq/observability';
import { runResearchAgent, ResearchOutput } from './researchAgent';
import { runDecisioningAgent, DecisioningOutput } from './decisioningAgent';
import { runExecutionAgent, ExecutionOutput } from './executionAgent';

export interface WorkflowResult {
  research: ResearchOutput;
  decision: DecisioningOutput;
  campaign: ExecutionOutput;
  summary: {
    totalLatencyMs: number;
    totalTokens: number;
    success: boolean;
  };
}

/**
 * Run the full agentic travel marketing workflow (Research -> Decisioning -> Execution).
 * Orchestrates inputs/outputs between all agents and updates database logs.
 * @param prisma The database client.
 * @param triggerQuery An optional user search query to configure the starting focus of the Research Agent.
 * @returns Combined result structure containing insights, decisions, generated campaign metadata, and summary performance.
 */
export async function runAgenticWorkflow(
  prisma: PrismaClient,
  triggerQuery?: string
): Promise<WorkflowResult> {
  const workflowStartTime = Date.now();
  let totalTokens = 0;

  try {
    logger.info({ triggerQuery }, 'Starting agentic workflow');

    // Step 1: Research
    logger.info('Step 1/3: Running research agent');
    const research = await runResearchAgent(
      prisma,
      triggerQuery || 'Find best hotel marketing opportunities'
    );
    totalTokens += 500; // Estimated

    // Step 2: Decisioning (uses research output)
    logger.info('Step 2/3: Running decisioning agent');
    const decision = await runDecisioningAgent(prisma, {
      researchInsights: research.insights,
      topOpportunities: research.topOpportunities,
    });
    totalTokens += 400; // Estimated

    // Step 3: Execution (uses decision output)
    logger.info('Step 3/3: Running execution agent');
    const campaign = await runExecutionAgent(prisma, { decision });
    totalTokens += 200; // Estimated

    const totalLatency = Date.now() - workflowStartTime;

    // Step 4: Save workflow summary to AgentLog
    await prisma.agentLog.create({
      data: {
        agentName: 'orchestrator',
        action: 'run_complete_workflow',
        input: { triggerQuery: triggerQuery || 'default' },
        output: {
          campaignId: campaign.campaignId,
          city: decision.recommendedCity,
          channel: decision.channel,
          segment: decision.targetSegment,
          topOpportunities: research.topOpportunities,
          totalSteps: 3,
        },
        latencyMs: totalLatency,
        tokenCost: totalTokens,
        confidence: (research.confidence + decision.confidence) / 2,
      },
    });

    const result: WorkflowResult = {
      research,
      decision,
      campaign,
      summary: {
        totalLatencyMs: totalLatency,
        totalTokens,
        success: true,
      },
    };

    logger.info(
      {
        totalLatency,
        totalTokens,
        campaignId: campaign.campaignId,
        city: decision.recommendedCity,
      },
      'Agentic workflow completed successfully'
    );

    console.log(`✅ Workflow complete in ${totalLatency}ms`);

    return result;
  } catch (error) {
    const totalLatency = Date.now() - workflowStartTime;
    
    logger.error({ error, totalLatency }, 'Agentic workflow failed');

    // Log failure to AgentLog
    try {
      await prisma.agentLog.create({
        data: {
          agentName: 'orchestrator',
          action: 'run_complete_workflow',
          input: { triggerQuery: triggerQuery || 'default', error: 'workflow_failed' },
          output: { error: error instanceof Error ? error.message : 'Unknown error' },
          latencyMs: totalLatency,
          tokenCost: totalTokens,
          confidence: 0,
        },
      });
    } catch (dbError) {
      logger.error({ dbError }, 'Failed to write failed workflow log to database');
    }

    throw error;
  }
}

