import { Request, Response, NextFunction } from 'express';
import { validateAccessToken } from '../services/authService.js';

/**
 * Extends Express Request to include authenticated player info
 */
export interface AuthenticatedRequest extends Request {
  player?: {
    playerId: string;
    username: string;
  };
}

/**
 * JWT authentication middleware.
 * Verifies the access token from the Authorization header.
 * Returns 401 if token is missing or invalid.
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      statusCode: 401,
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = validateAccessToken(token);
    req.player = decoded;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    res.status(401).json({
      error: 'Unauthorized',
      message,
      statusCode: 401,
    });
  }
}
