const { ErrorCodes } = require('./errorCodes');

class ApiError extends Error {
  constructor(status, message, code = ErrorCodes.INTERNAL_ERROR, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Ошибка валидации входящих данных', details = undefined) {
    super(400, message, ErrorCodes.VALIDATION_ERROR, details);
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'Ресурс', key = undefined) {
    super(404, `${resource} не найден`, ErrorCodes.RESOURCE_NOT_FOUND, key ? { key } : undefined);
  }
}

class UnauthorizedError extends ApiError {
  constructor(
    message = 'Требуется аутентификация',
    details = undefined,
    code = ErrorCodes.UNAUTHORIZED,
  ) {
    const effectiveCode =
      details && typeof details === 'object' && details.code ? details.code : code;
    super(401, message, effectiveCode, details);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Доступ запрещен', details = undefined, code = ErrorCodes.FORBIDDEN) {
    const effectiveCode =
      details && typeof details === 'object' && details.code ? details.code : code;
    super(403, message, effectiveCode, details);
  }
}

class ConflictError extends ApiError {
  constructor(
    message = 'Конфликт состояния ресурса',
    details = undefined,
    code = ErrorCodes.CONFLICT,
  ) {
    const effectiveCode =
      details && typeof details === 'object' && details.code ? details.code : code;
    super(409, message, effectiveCode, details);
  }
}

module.exports = {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};
