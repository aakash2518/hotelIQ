import { Router, Request, Response } from 'express';
import prisma from '../db/setup';
import { logger } from '@hoteliq/observability';
import {
  runAgenticWorkflow,
  runResearchAgent,
  runDecisioningAgent,
  updateAgentContext,
  CampaignMetrics,
} from '@hoteliq/agents';

const router = Router();

/**
 * GET /api/agents
 * Returns a summary of available agent endpoints and their descriptions.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'HotelIQ Agentic AI System',
      version: '1.0.0',
      agents: [
        {
          name: 'orchestrator',
          description: 'Runs the full 3-agent workflow: Research → Decisioning → Execution',
          endpoint: 'POST /api/agents/run',
        },
        {
          name: 'research',
          description: 'Analyzes hotel market data and identifies opportunities',
          endpoint: 'POST /api/agents/research',
        },
        {
          name: 'decisioning',
          description: 'Recommends campaign strategies based on research insights',
          endpoint: 'POST /api/agents/decision',
        },
        {
          name: 'execution',
          description: 'Generates campaign content and saves to database',
          endpoint: 'POST /api/pipelines/execute',
        },
      ],
      logs: 'GET /api/agents/logs',
    },
  });
});

/**
 * GET /api/agents/status
 * Returns current agent system status.
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const logCount = await prisma.agentLog.count();
    const recentLogs = await prisma.agentLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { agentName: true, action: true, createdAt: true, latencyMs: true },
    });
    res.json({
      success: true,
      data: {
        status: 'operational',
        totalLogsRecorded: logCount,
        recentActivity: recentLogs,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch agent status');
    res.status(500).json({ success: false, error: 'Failed to fetch agent status' });
  }
});

/**
 * POST /api/agents/run
 * Trigger the full 3-agent orchestration workflow (Research -> Decisioning -> Execution).
 * Returns: { success: true, data: WorkflowResult, meta: { message: string } }
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    logger.info({ query }, 'Full agentic workflow triggered via API');

    const result = await runAgenticWorkflow(prisma, query);

    res.json({
      success: true,
      data: result,
      meta: { message: 'Agentic workflow completed' }
    });
  } catch (error) {
    logger.error({ error }, 'Agentic workflow failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'WORKFLOW_FAILED'
    });
  }
});

/**
 * POST /api/agents/research
 * Run only the Research Agent phase of the AI workflow.
 * Returns: { success: true, data: ResearchOutput, meta: { message: string } }
 */
router.post('/research', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    logger.info({ query }, 'Research agent triggered via API');

    const result = await runResearchAgent(
      prisma,
      query || 'Find best hotel marketing opportunities'
    );

    res.json({
      success: true,
      data: result,
      meta: { message: 'Research agent completed' }
    });
  } catch (error) {
    logger.error({ error }, 'Research agent failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'RESEARCH_AGENT_FAILED'
    });
  }
});

/**
 * POST /api/agents/decision
 * Run only the Decisioning Agent phase of the AI workflow.
 * Returns: { success: true, data: DecisioningOutput, meta: { message: string } }
 */
router.post('/decision', async (req: Request, res: Response) => {
  try {
    const { researchInsights, topOpportunities } = req.body;
    
    if (!researchInsights || !topOpportunities) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: researchInsights, topOpportunities',
        code: 'BAD_REQUEST'
      });
    }

    logger.info({ opportunitiesCount: topOpportunities.length }, 'Decisioning agent triggered via API');

    const result = await runDecisioningAgent(prisma, {
      researchInsights,
      topOpportunities,
    });

    res.json({
      success: true,
      data: result,
      meta: { message: 'Decisioning agent completed' }
    });
  } catch (error) {
    logger.error({ error }, 'Decisioning agent failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'DECISIONING_AGENT_FAILED'
    });
  }
});

/**
 * GET /api/agents/logs
 * Retrieve agent execution logs, with optional filtering by agent name and custom retrieval limits.
 * Returns: { success: true, data: Array<AgentLog> }
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { limit = '50', agentName } = req.query;

    const where = agentName ? { agentName: agentName as string } : {};

    const logs = await prisma.agentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    logger.info({ count: logs.length, agentName }, 'Fetched agent logs');
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch agent logs');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent logs',
      code: 'FETCH_AGENT_LOGS_FAILED'
    });
  }
});

/**
 * PUT /api/agents/campaigns/:id/metrics
 * Update campaign metrics and trigger the feedback loop for AI model self-optimization.
 * Returns: { success: true, data: { status: string }, meta: { message: string } }
 */
router.put('/campaigns/:id/metrics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const metrics: CampaignMetrics = req.body;

    if (!metrics.sent || !metrics.opened || !metrics.clicked || !metrics.converted) {
      return res.status(400).json({
        success: false,
        error: 'Missing required metrics: sent, opened, clicked, converted',
        code: 'BAD_REQUEST'
      });
    }

    logger.info({ campaignId: id, metrics }, 'Updating campaign metrics and triggering feedback loop');

    await updateAgentContext(prisma, id, metrics);

    res.json({
      success: true,
      data: { status: 'completed' },
      meta: { message: 'Campaign metrics updated and feedback loop triggered' }
    });
  } catch (error) {
    logger.error({ error, campaignId: req.params.id }, 'Failed to update campaign metrics');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UPDATE_CAMPAIGN_METRICS_FAILED'
    });
  }
});

export default router;

