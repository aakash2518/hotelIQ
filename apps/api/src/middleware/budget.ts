import { Request, Response, NextFunction } from 'express';
import { logger } from '@hoteliq/observability';

interface RequestWithTiming extends Request {
  startTime?: number;
}

const PERFORMANCE_BUDGETS = {
  DEFAULT_ROUTE: 2000,    // 2 seconds for normal routes
  AGENT_WORKFLOW: 30000,  // 30 seconds for agent workflows
  HEAVY_QUERY: 5000,      // 5 seconds for complex database queries
};

export function performanceBudget(
  req: RequestWithTiming,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  req.startTime = startTime;

  // Add response time header
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Cannot set headers here because response is already finished
    // res.setHeader('X-Response-Time', `${duration}ms`);

    // Determine budget based on route
    let budget = PERFORMANCE_BUDGETS.DEFAULT_ROUTE;
    
    if (req.path.includes('/api/agents/run')) {
      budget = PERFORMANCE_BUDGETS.AGENT_WORKFLOW;
    } else if (req.path.includes('/api/hotels') || req.path.includes('/api/campaigns')) {
      budget = PERFORMANCE_BUDGETS.HEAVY_QUERY;
    }

    // Log budget violations
    if (duration > budget) {
      const violationData = {
        path: req.path,
        method: req.method,
        duration,
        budget,
        overrun: duration - budget,
        overrunPercent: Math.round(((duration - budget) / budget) * 100),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        statusCode: res.statusCode,
      };

      if (duration > budget * 2) {
        // Severe violation (2x over budget)
        logger.error(
          {
            ...violationData,
            severity: 'severe',
            alert: 'performance_budget_violation',
          },
          `SEVERE performance budget violation: ${req.method} ${req.path} took ${duration}ms (budget: ${budget}ms)`
        );
      } else {
        // Regular violation
        logger.warn(
          {
            ...violationData,
            severity: 'moderate',
            alert: 'performance_budget_violation',
          },
          `Performance budget violation: ${req.method} ${req.path} took ${duration}ms (budget: ${budget}ms)`
        );
      }
    } else if (duration > budget * 0.8) {
      // Warning when approaching budget (80% of budget)
      logger.info(
        {
          path: req.path,
          method: req.method,
          duration,
          budget,
          utilizationPercent: Math.round((duration / budget) * 100),
        },
        `Performance budget warning: ${req.method} ${req.path} approaching limit (${duration}ms of ${budget}ms budget)`
      );
    }

    // Log successful fast responses for monitoring
    if (duration < budget * 0.1) {
      logger.debug(
        {
          path: req.path,
          method: req.method,
          duration,
          budget,
          performance: 'excellent',
        },
        `Excellent performance: ${req.method} ${req.path} completed in ${duration}ms`
      );
    }
  });

  next();
}

// Middleware to track specific operation performance
export function trackOperation(operationName: string, expectedDurationMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const operationStart = Date.now();

    // Store operation info in response locals
    res.locals.operation = {
      name: operationName,
      startTime: operationStart,
      expectedDuration: expectedDurationMs,
    };

    res.on('finish', () => {
      const duration = Date.now() - operationStart;
      
      if (duration > expectedDurationMs) {
        logger.warn(
          {
            operation: operationName,
            duration,
            expectedDuration: expectedDurationMs,
            overrun: duration - expectedDurationMs,
            path: req.path,
            method: req.method,
          },
          `Operation "${operationName}" exceeded expected duration`
        );
      } else {
        logger.info(
          {
            operation: operationName,
            duration,
            expectedDuration: expectedDurationMs,
            path: req.path,
            method: req.method,
          },
          `Operation "${operationName}" completed successfully`
        );
      }
    });

    next();
  };
}