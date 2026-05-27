import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';
import { getRequestLogger } from '../lib/logger';

/**
 * Request validation middleware using Zod schemas.
 *
 * Validates the combined body, params, and query against the provided schema.
 * On validation failure, throws a ValidationError that flows to the global
 * error handler for consistent error formatting.
 *
 * @param schema - Zod schema to validate against
 * @param source   - Which request parts to validate ('body' | 'params' | 'query' | 'all')
 *
 * @example
 * router.post('/campaigns', validateRequest(createCampaignSchema), handler);
 * router.get('/campaigns/:id', validateRequest(getCampaignSchema, 'all'), handler);
 */
export const validateRequest = (
  schema: ZodSchema,
  source: 'body' | 'params' | 'query' | 'all' = 'all',
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      let data: Record<string, unknown>;

      switch (source) {
        case 'body':
          data = req.body;
          break;
        case 'params':
          data = req.params;
          break;
        case 'query':
          data = req.query as Record<string, unknown>;
          break;
        case 'all':
        default:
          data = { ...req.body, ...req.params, ...req.query };
          break;
      }

      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a clean, readable structure
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        // Log validation failures for security monitoring
        const correlationId = req.headers['x-request-id'] as string | undefined;
        if (correlationId) {
          const logger = getRequestLogger(correlationId);
          logger.debug({ validationErrors: details }, 'Request validation failed');
        }

        next(new ValidationError('Request validation failed', { errors: details }));
      } else {
        next(error);
      }
    }
  };
};
