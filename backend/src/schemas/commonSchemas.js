const { z } = require('zod');

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

function requiredIdParam(paramName = 'id') {
  return z.object({
    [paramName]: z
      .string({ required_error: `Параметр пути '${paramName}' обязателен` })
      .trim()
      .min(1, { message: `Параметр пути '${paramName}' обязателен` }),
  });
}

module.exports = {
  paginationQuerySchema,
  requiredIdParam,
};
