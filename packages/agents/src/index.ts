export { generateEmbedding, embedAllHotels } from './embeddings';
export { ResearchAgent, runResearchAgent, ResearchOutput } from './researchAgent';
export { DecisioningAgent, runDecisioningAgent, DecisioningInput, DecisioningOutput } from './decisioningAgent';
export { ExecutionAgent, runExecutionAgent, ExecutionInput, ExecutionOutput } from './executionAgent';
export { runAgenticWorkflow, WorkflowResult } from './orchestrator';
export { updateAgentContext, CampaignMetrics } from './feedbackLoop';
export { HotelTools } from './tools/hotelTools';
export { getAllFlags, getFlag, setFlag, callLLMWithFallback, retryWithFlag } from './flags';

// Legacy export for backward compatibility
import { logger } from '@hoteliq/observability';

export class AgentOrchestrator {
  constructor() {
    logger.info('Agent orchestrator initialized');
  }

  async execute(task: string): Promise<string> {
    logger.info({ task }, 'Executing agent task');
    return `Task "${task}" executed successfully`;
  }
}

export default AgentOrchestrator;
