import { fail } from '../utils/response.js';

/**
 * Validation middleware factory
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {('body'|'query'|'params')} source - Where to validate from (body, query, or params)
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error.errors) {
        // Zod validation error
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        return fail(res, messages.join(', '), 400);
      }
      return fail(res, 'Validation failed', 400);
    }
  };
};
