const { z } = require('zod');
const { requiredIdParam } = require('./commonSchemas');

const addCartItemBodySchema = z.object({
  productId: z
    .string({ required_error: 'Поле productId обязательно' })
    .trim()
    .min(1, { message: 'Поле productId обязательно' }),
  quantity: z
    .number({ invalid_type_error: 'Количество должно быть положительным целым числом' })
    .int({ message: 'Количество должно быть положительным целым числом' })
    .min(1, { message: 'Количество должно быть положительным целым числом' })
    .optional()
    .default(1),
});

const updateCartItemBodySchema = z.object({
  quantity: z
    .number({
      required_error: 'Количество должно быть положительным целым числом',
      invalid_type_error: 'Количество должно быть положительным целым числом',
    })
    .int({ message: 'Количество должно быть положительным целым числом' })
    .min(1, { message: 'Количество должно быть положительным целым числом' }),
});

const checkoutCartBodySchema = z.object({
  deliveryAddressId: z
    .string({ required_error: 'Поле deliveryAddressId обязательно для оформления заказа' })
    .trim()
    .min(1, { message: 'Поле deliveryAddressId обязательно для оформления заказа' }),
});

module.exports = {
  addCartItemBodySchema,
  updateCartItemBodySchema,
  checkoutCartBodySchema,
  cartProductParamSchema: requiredIdParam('productId'),
};
