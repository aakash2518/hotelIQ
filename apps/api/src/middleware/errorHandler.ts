import { Request, Response, NextFunction } from 'express';
import { logger } from '@hoteliq/observability';

/**
 * Express global error handling middleware.
 * Catches all unhandled errors, logs details, and returns a uniform JSON response.
 */
export function errorHandler(
  err: Error & { status?: number; statusCode?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // Log full error details with the observability logger
  logger.error({
    err,
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode,
  }, `Unhandled error occurred: ${message}`);

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

export default errorHandler;
