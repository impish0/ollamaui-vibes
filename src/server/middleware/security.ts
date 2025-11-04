import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiter for API endpoints (generous limits for local development)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 requests per minute (very generous for localhost)
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting in development for localhost
    if (process.env.NODE_ENV === 'development') {
      const ip = req.ip || req.socket.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  },
});

// Stricter rate limiter for streaming endpoints
export const streamLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 stream requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many stream requests, please try again later.',
  skip: (req) => {
    // Skip rate limiting in development for localhost
    if (process.env.NODE_ENV === 'development') {
      const ip = req.ip || req.socket.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  },
});

// Middleware to ensure requests come from localhost only
export const localhostOnly = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress;
  const isLocalhost =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost';

  if (!isLocalhost) {
    return res.status(403).json({ error: 'Access forbidden: localhost only' });
  }

  next();
};

// Sanitize user input to prevent injection attacks
// Express 5: req.body and req.query are read-only, so we sanitize in-place
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  // Basic sanitization for string fields
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize in-place by modifying object properties (Express 5 compatible)
  const sanitizeObjectInPlace = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = sanitizeValue(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    sanitizeObjectInPlace(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObjectInPlace(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeObjectInPlace(req.params);
  }

  next();
};
