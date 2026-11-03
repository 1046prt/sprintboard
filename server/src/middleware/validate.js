import AppError from '../utils/AppError.js';

// Parsed (and trimmed / coerced) input ends up on req.valid[source], so
// controllers never touch the raw request data.
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(new AppError('Validation failed', 400, details));
    }
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
