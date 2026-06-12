import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { logger } from './logger';

export interface RequestWithTracing extends Request {
  requestId?: string;
  startTime?: number;
}

export interface ResponseWithTracing extends Response {
  locals: {
    requestId?: string;
    userId?: string;
  };
}

export const tracerMiddleware = (
  req: RequestWithTracing,
  res: ResponseWithTracing,
  next: NextFunction
): void => {
  const requestId = nanoid();
  const startTime = Date.now();

  // Attach to request and response
  req.requestId = requestId;
  req.startTime = startTime;
  res.locals.requestId = requestId;

  // Log incoming request
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: res.locals.userId,
  }, 'Request started');

  // Handle response finish
  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;
    
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latencyMs,
      userId: res.locals.userId,
      contentLength: res.get('Content-Length'),
    };

    // Different log levels based on status code
    if (res.statusCode >= 500) {
      logger.error(logData, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with client error');
    } else if (latencyMs > 5000) {
      logger.warn(logData, 'Request completed (slow response)');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  // Handle response error
  res.on('error', (error) => {
    const latencyMs = Date.now() - startTime;
    
    logger.error({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latencyMs,
      error: error.message,
      stack: error.stack,
      userId: res.locals.userId,
    }, 'Request failed with error');
  });

  // Add X-Request-ID header
  res.setHeader('X-Request-ID', requestId);

  next();
};