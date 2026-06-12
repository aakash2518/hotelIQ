import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export interface RequestWithId extends Request {
  id?: string;
}

export const requestLogger = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  const requestId = uuidv4();
  const startTime = Date.now();

  req.id = requestId;

  // Log incoming request
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  }, 'Incoming request');

  // Log response
  res.on('finish', () => {
    const latency = Date.now() - startTime;
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    }, 'Request completed');
  });

  next();
};
