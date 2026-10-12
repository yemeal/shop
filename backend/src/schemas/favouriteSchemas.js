const { z } = require('zod');

const addFavouriteBodySchema = z.object({
  productId: z
    .string({ required_error: 'Поле productId обязательно' })
    .trim()
    .min(1, { message: 'Поле productId обязательно' }),
});

const favouriteParamsSchema = z.object({
  userId: z
    .string({ required_error: "Параметр пути 'userId' обязателен" })
    .trim()
    .min(1, { message: "Параметр пути 'userId' обязателен" }),
  productId: z
    .string({ required_error: "Параметр пути 'productId' обязателен" })
    .trim()
    .min(1, { message: "Параметр пути 'productId' обязателен" }),
});

module.exports = {
  addFavouriteBodySchema,
  favouriteParamsSchema,
};
