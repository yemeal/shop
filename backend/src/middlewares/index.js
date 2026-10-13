const { validateRequest } = require('../schemas/validator');
const { requireAuth, optionalAuth, extractToken } = require('./authMiddleware');
const { requireRole } = require('./roleMiddleware');
const { errorMiddleware } = require('../errors');

module.exports = {
  validateRequest,
  requireAuth,
  optionalAuth,
  extractToken,
  requireRole,
  errorMiddleware,
};
