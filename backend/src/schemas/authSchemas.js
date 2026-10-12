const { z } = require('zod');

const registerBodySchema = z.object({
  email: z
    .string({ required_error: "Поле 'email' обязательно для заполнения" })
    .trim()
    .email({ message: 'Некорректный формат email' })
    .min(3, { message: "Длина поля 'email' должна быть не менее 3 символов" })
    .max(255, { message: "Длина поля 'email' не должна превышать 255 символов" }),
  password: z
    .string({ required_error: 'Пароль обязателен (минимум 8 символов)' })
    .min(8, { message: "Длина поля 'password' должна быть не менее 8 символов" })
    .max(128, { message: "Длина поля 'password' не должна превышать 128 символов" }),
  firstName: z
    .string()
    .trim()
    .max(100, { message: "Длина поля 'firstName' не должна превышать 100 символов" })
    .nullable()
    .optional()
    .default(null),
  lastName: z
    .string()
    .trim()
    .max(100, { message: "Длина поля 'lastName' не должна превышать 100 символов" })
    .nullable()
    .optional()
    .default(null),
});

const loginBodySchema = z.object({
  email: z
    .string({ required_error: "Поле 'email' обязательно для заполнения" })
    .trim()
    .min(1, { message: "Поле 'email' не должно быть пустым" }),
  password: z
    .string({ required_error: "Поле 'password' обязательно для заполнения" })
    .min(1, { message: "Поле 'password' не должно быть пустым" }),
});

module.exports = {
  registerBodySchema,
  loginBodySchema,
};
