import { logger } from './logger';

export interface AgentLog {
  id: string;
  agentName: string;
  action: string;
  input: any;
  output: any;
  latencyMs: number;
  tokenCost?: number;
  confidence?: number;
  createdAt: Date;
}

export function checkAndAlert(agentLog: AgentLog): void {
  const logContext = {
    agentLogId: agentLog.id,
    agentName: agentLog.agentName,
    action: agentLog.action,
    latencyMs: agentLog.latencyMs,
    confidence: agentLog.confidence,
    tokenCost: agentLog.tokenCost,
    createdAt: agentLog.createdAt,
    input: agentLog.input,
    output: agentLog.output,
  };

  // Low confidence alert
  if (agentLog.confidence !== undefined && agentLog.confidence < 0.5) {
    logger.warn(
      {
        ...logContext,
        alert: 'low_confidence',
        threshold: 0.5,
      },
      'Low confidence agent decision detected'
    );
  }

  // Slow response alert
  if (agentLog.latencyMs > 10000) {
    logger.warn(
      {
        ...logContext,
        alert: 'slow_response',
        threshold: 10000,
      },
      `Slow agent response: ${agentLog.latencyMs}ms`
    );
  }

  // Critical decisioning agent alert
  if (
    agentLog.agentName === 'decisioning' && 
    agentLog.confidence !== undefined && 
    agentLog.confidence < 0.6
  ) {
    logger.error(
      {
        ...logContext,
        alert: 'critical_decisioning',
        threshold: 0.6,
        severity: 'critical',
        recommendation: 'manual_review_required',
      },
      'Decisioning agent below threshold - manual review recommended'
    );
  }

  // Token cost alert for expensive operations
  if (agentLog.tokenCost !== undefined && agentLog.tokenCost > 5000) {
    logger.warn(
      {
        ...logContext,
        alert: 'high_token_cost',
        threshold: 5000,
      },
      `High token cost detected: ${agentLog.tokenCost} tokens`
    );
  }

  // Orchestrator failure alert
  if (agentLog.agentName === 'orchestrator' && agentLog.output?.error) {
    logger.error(
      {
        ...logContext,
        alert: 'orchestrator_failure',
        severity: 'critical',
        error: agentLog.output.error,
      },
      'Agent orchestrator workflow failed'
    );
  }
}