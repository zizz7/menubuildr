import { Response } from 'express';
import { ZodError } from 'zod';
import { sendError } from './errors';

/**
 * Shared Zod error formatter — eliminates per-route ZodError handling divergence.
 * Always produces: 400 { error: 'Validation error', details: '...' }
 */
export function handleZodError(res: Response, err: unknown): void {
  if (err instanceof ZodError) {
    const details = err.issues
      .map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
      .join(', ');
    sendError(res, 400, 'Validation error', details);
  } else {
    sendError(res, 400, 'Validation error');
  }
}
