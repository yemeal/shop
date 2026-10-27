const { ErrorCodes } = require('../errors/errorCodes');

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function errorMiddleware(error, request, response, _next) {
  if (response.headersSent) {
    return _next(error);
  }

  // обработка ошибок ограничений sqlite без утечки структуры бд
  if (
    error.code === 'SQLITE_CONSTRAINT' ||
    (typeof error.code === 'string' && error.code.startsWith('SQLITE_CONSTRAINT_'))
  ) {
    return response.status(409).json({
      error: {
        code: ErrorCodes.DATABASE_CONSTRAINT,
        message: 'Операция нарушает ограничение базы данных',
      },
    });
  }

  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;

  const isInternal = status >= 500;

  if (isInternal) {
    console.error(`[Unhandled Server Error] ${request.method} ${request.originalUrl}:`, error);
  }

  const responseBody = {
    error: {
      code: error.code || (isInternal ? ErrorCodes.INTERNAL_ERROR : 'API_ERROR'),
      message: isInternal
        ? 'Внутренняя ошибка сервера'
        : error.message || 'Произошла ошибка при обработке запроса',
    },
  };

  if (!isInternal && error.details !== undefined) {
    responseBody.error.details = error.details;
  }

  return response.status(status).json(responseBody);
}

module.exports = {
  asyncHandler,
  errorMiddleware,
};
