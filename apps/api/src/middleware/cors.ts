import { Request, Response, NextFunction } from 'express';

/**
 * Custom CORS middleware configuration.
 * Allows access from http://localhost:3000 and process.env.WEB_URL.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowedOrigins = [
    'http://localhost:3000',
    process.env.WEB_URL
  ].filter(Boolean) as string[];

  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Fallback for non-browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}

export default corsMiddleware;
