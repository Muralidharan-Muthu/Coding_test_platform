import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  res.on('finish', () => {
    const duration = Math.round(performance.now() - start);
    // Suppress spammy health check logging in production
    if (req.originalUrl === '/health') return;
    console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
}

export default requestLogger;
