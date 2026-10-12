const { z } = require('zod');
const { ValidationError } = require('../errors');

function formatZodIssue(issue) {
  let field = issue.path.join('.');
  field = field.replace(/\.(\d+)(?=(\.|$))/g, '[$1]');

  let code = 'VALIDATION_ERROR';
  if (issue.code === 'too_small') {
    code = issue.type === 'string' ? 'MIN_LENGTH' : (issue.type === 'array' ? 'MIN_ITEMS' : 'MIN_VALUE');
  } else if (issue.code === 'too_big') {
    code = issue.type === 'string' ? 'MAX_LENGTH' : (issue.type === 'array' ? 'MAX_ITEMS' : 'MAX_VALUE');
  } else if (issue.code === 'invalid_type') {
    if (issue.received === 'undefined' || issue.received === 'null') {
      code = 'REQUIRED';
    } else {
      code = 'INVALID_TYPE';
    }
  } else if (issue.code === 'invalid_enum_value') {
    code = 'INVALID_ENUM';
  } else if (issue.code === 'custom') {
    code = issue.params?.code || 'CUSTOM_VALIDATION';
  }

  return {
    field: field || 'body',
    code,
    message: issue.message,
  };
}

/**
 * Express middleware для декларативной валидации запросов через Zod схемы
 *
 * @param {Object} schemas
 * @param {import('zod').ZodType} [schemas.params]
 * @param {import('zod').ZodType} [schemas.query]
 * @param {import('zod').ZodType} [schemas.body]
 * @param {boolean} [schemas.bodyIsArray]
 */
function validateRequest(schemas = {}) {
  return (req, _res, next) => {
    const allErrors = [];

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params || {});
      if (!result.success) {
        allErrors.push(...result.error.issues.map(formatZodIssue));
      } else {
        req.params = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query || {});
      if (!result.success) {
        allErrors.push(...result.error.issues.map(formatZodIssue));
      } else {
        req.query = result.data;
      }
    }

    if (schemas.body) {
      if (req.body === undefined || typeof req.body !== 'object' || (Array.isArray(req.body) && !schemas.bodyIsArray)) {
        allErrors.push({
          field: 'body',
          code: 'INVALID_BODY',
          message: 'Тело запроса должно быть JSON-объектом',
        });
      } else {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          allErrors.push(...result.error.issues.map(formatZodIssue));
        } else {
          req.body = result.data;
        }
      }
    }

    if (allErrors.length > 0) {
      return next(new ValidationError('Ошибка валидации входящих данных', allErrors));
    }

    next();
  };
}

module.exports = {
  validateRequest,
  formatZodIssue,
};
