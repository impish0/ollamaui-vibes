import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from './errorHandler.js';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Zod schema
 */

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Validate request data against a Zod schema
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, params, or query)
 */
export const validate = (schema: z.ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Get the data to validate based on target
      const dataToValidate = req[target];

      // Validate and parse the data
      const parsed = schema.parse(dataToValidate);

      // Replace the request data with the parsed (and potentially transformed) data
      // This ensures type safety and applies default values
      // Note: req.query is read-only, so we use Object.defineProperty for it
      if (target === 'query') {
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } else {
        (req as any)[target] = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod errors into a user-friendly format
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        // Use the first error message as the main message
        const mainMessage = errors[0]?.message || 'Validation failed';

        next(new ApiError(mainMessage, 400, { validationErrors: errors }));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Convenience function for validating request body
 */
export const validateBody = (schema: z.ZodSchema) => validate(schema, 'body');

/**
 * Convenience function for validating request params
 */
export const validateParams = (schema: z.ZodSchema) => validate(schema, 'params');

/**
 * Convenience function for validating query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => validate(schema, 'query');

/**
 * Combined validation for multiple targets
 * Example: validateAll({ body: createChatSchema, params: chatIdParamSchema })
 */
export const validateAll = (schemas: Partial<Record<ValidationTarget, z.ZodSchema>>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const middlewares: ((req: Request, res: Response, next: NextFunction) => void)[] = [];

    if (schemas.body) middlewares.push(validate(schemas.body, 'body'));
    if (schemas.params) middlewares.push(validate(schemas.params, 'params'));
    if (schemas.query) middlewares.push(validate(schemas.query, 'query'));

    // Execute all validations in sequence
    const runNext = (index: number): void => {
      if (index >= middlewares.length) {
        return next();
      }

      middlewares[index](req, res, (err?: unknown) => {
        if (err) return next(err);
        runNext(index + 1);
      });
    };

    runNext(0);
  };
};
