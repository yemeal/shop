const { z } = require('zod');
const { paginationQuerySchema, requiredIdParam } = require('./commonSchemas');

const createOrderBodySchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    deliveryAddressId: z
      .string({ required_error: 'Поле deliveryAddressId обязательно' })
      .trim()
      .min(1, { message: 'Поле deliveryAddressId обязательно' }),
    items: z
      .array(
        z.object({
          productId: z
            .string({ required_error: 'Каждая позиция должна содержать productId' })
            .trim()
            .min(1, { message: 'Каждая позиция должна содержать productId' }),
          quantity: z
            .number({
              required_error: 'Количество товара должно быть положительным целым числом',
              invalid_type_error: 'Количество товара должно быть положительным целым числом',
            })
            .int({ message: 'Количество товара должно быть положительным целым числом' })
            .min(1, { message: 'Количество товара должно быть положительным целым числом' }),
        }),
        { required_error: 'Заказ должен содержать хотя бы один товар' },
      )
      .min(1, { message: 'Заказ должен содержать хотя бы один товар' }),
  })
  .superRefine((data, ctx) => {
    if (Array.isArray(data.items)) {
      const ids = data.items.map((it) => it.productId).filter(Boolean);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: 'Один товар нельзя добавить в заказ дважды',
          params: { code: 'CUSTOM_VALIDATION' },
        });
      }
    }
  });

const orderIdParamSchema = requiredIdParam('orderId');
const userIdParamSchema = requiredIdParam('userId');

const updateOrderStatusBodySchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']),
});

const adminOrderListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']).optional(),
});

module.exports = {
  createOrderBodySchema,
  orderIdParamSchema,
  userIdParamSchema,
  updateOrderStatusBodySchema,
  orderListQuerySchema: paginationQuerySchema,
  adminOrderListQuerySchema,
};
