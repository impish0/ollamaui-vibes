import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/logger.js';

/**
 * Standardized error response format
 */
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
    stack?: string;
  };
  timestamp: string;
  path: string;
  method: string;
}

/**
 * Custom API Error class with additional context
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = this.getErrorCode(statusCode);
    this.details = details;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  private getErrorCode(statusCode: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[statusCode] || 'UNKNOWN_ERROR';
  }
}

/**
 * Global error handler middleware
 * Provides consistent error responses across the API
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Extract error details
  const statusCode = (err instanceof ApiError) ? err.statusCode : 500;
  const code = (err instanceof ApiError) ? err.code : 'INTERNAL_SERVER_ERROR';
  const details = (err instanceof ApiError) ? err.details : undefined;

  // Log the error with context
  logError('Request error', err, {
    path: req.path,
    method: req.method,
    statusCode,
    code,
    ip: req.ip,
  });

  // Build standardized error response
  const errorResponse: ErrorResponse = {
    error: {
      message: err.message || 'An unexpected error occurred',
      code,
      statusCode,
      details,
      // Include stack trace only in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Send error response
  return res.status(statusCode).json(errorResponse);
};
