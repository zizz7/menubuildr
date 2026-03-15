import { Response } from 'express';

/**
 * Shared error response helper — single source of truth for all error shapes.
 * Every error response satisfies: { error: string, code?: string, details?: string }
 */
export function sendError(
  res: Response,
  status: number,
  error: string,
  details?: string,
  code?: string
): void {
  res.status(status).json({
    error,
    ...(code !== undefined && { code }),
    ...(details !== undefined && { details }),
  });
}
