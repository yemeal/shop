const { validateRequest } = require('../schemas/validator');
const { requireAuth, optionalAuth, extractToken } = require('./authMiddleware');
const { requireRole } = require('./roleMiddleware');
const { asyncHandler, errorMiddleware } = require('./errorMiddleware');

module.exports = {
  validateRequest,
  requireAuth,
  optionalAuth,
  extractToken,
  requireRole,
  asyncHandler,
  errorMiddleware,
};
