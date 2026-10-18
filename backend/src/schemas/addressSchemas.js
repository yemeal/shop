const { z } = require('zod');
const { requiredIdParam } = require('./commonSchemas');

const userIdParamSchema = requiredIdParam('userId');
const addressIdParamSchema = requiredIdParam('addressId');

const userAddressParamsSchema = z.object({
  userId: z
    .string({ required_error: "Параметр пути 'userId' обязателен" })
    .trim()
    .min(1, { message: "Параметр пути 'userId' обязателен" }),
  addressId: z
    .string({ required_error: "Параметр пути 'addressId' обязателен" })
    .trim()
    .min(1, { message: "Параметр пути 'addressId' обязателен" }),
});

const createAddressBodySchema = z.object({
  country: z
    .string({ invalid_type_error: 'Поле country должно быть строкой' })
    .trim()
    .min(1, { message: 'Название страны не должно быть пустым' })
    .max(100, { message: 'Название страны не должно превышать 100 символов' })
    .nullable()
    .optional()
    .transform((val) => (!val || val.trim() === '' ? 'Россия' : val.trim())),
  city: z
    .string({
      required_error: 'Поле city обязательно',
      invalid_type_error: 'Поле city должно быть строкой',
    })
    .trim()
    .min(1, { message: 'Поле city обязательно' })
    .max(100, { message: 'Название города не должно превышать 100 символов' }),
  street: z
    .string({
      required_error: 'Поле street обязательно',
      invalid_type_error: 'Поле street должно быть строкой',
    })
    .trim()
    .min(1, { message: 'Поле street обязательно' })
    .max(255, { message: 'Название улицы не должно превышать 255 символов' }),
  house: z
    .string({
      required_error: 'Поле house обязательно',
      invalid_type_error: 'Поле house должно быть строкой',
    })
    .trim()
    .min(1, { message: 'Поле house обязательно' })
    .max(50, { message: 'Номер дома не должен превышать 50 символов' }),
  apartment: z
    .string({ invalid_type_error: 'Поле apartment должно быть строкой' })
    .trim()
    .max(50, { message: 'Номер квартиры не должен превышать 50 символов' })
    .nullable()
    .optional()
    .transform((val) => (val === '' ? null : val ?? null)),
});

module.exports = {
  userIdParamSchema,
  addressIdParamSchema,
  userAddressParamsSchema,
  createAddressBodySchema,
};
