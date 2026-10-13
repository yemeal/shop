const { ForbiddenError, UnauthorizedError } = require('../errors');

/**
 * проверка необходимых ролей пользователя
 *
 * @param {string|string[]} roles
 */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Требуется авторизация'));
    }

    const allowed = roles.flat();
    if (!allowed.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Доступ запрещен: действие доступно только для ролей (${allowed.join(', ')})`,
          { requiredRole: allowed, currentRole: req.user.role },
        ),
      );
    }

    next();
  };
}

module.exports = { requireRole };
