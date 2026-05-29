import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../lib/errors';

/**
 * Enhanced Zod validation middleware that strips unknown fields.
 * This prevents clients from sending server-controlled fields.
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // strict() + strip prevents extra fields from being accepted
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError(
          `Validation failed: ${issues.map((i) => `${i.path}: ${i.message}`).join(', ')}`,
          issues,
        );
      }
      // Replace req.body with validated (and stripped) data
      req.body = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validate query parameters with strict parsing.
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError(
          `Query validation failed: ${issues.map((i) => `${i.path}: ${i.message}`).join(', ')}`,
          issues,
        );
      }
      req.query = result.data as Record<string, unknown>;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validate route parameters.
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError(
          `Param validation failed: ${issues.map((i) => `${i.path}: ${i.message}`).join(', ')}`,
          issues,
        );
      }
      req.params = result.data as Record<string, string>;
      next();
    } catch (err) {
      next(err);
    }
  };
}
