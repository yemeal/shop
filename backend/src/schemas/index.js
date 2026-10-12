const { validateRequest, formatZodIssue } = require('./validator');
const commonSchemas = require('./commonSchemas');
const catalogSchemas = require('./catalogSchemas');
const orderSchemas = require('./orderSchemas');
const favouriteSchemas = require('./favouriteSchemas');
const authSchemas = require('./authSchemas');
const cartSchemas = require('./cartSchemas');

module.exports = {
  validateRequest,
  formatZodIssue,
  ...commonSchemas,
  ...catalogSchemas,
  ...orderSchemas,
  ...favouriteSchemas,
  ...authSchemas,
  ...cartSchemas,
};
