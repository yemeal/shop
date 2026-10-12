const { z } = require('zod');
const { paginationQuerySchema, requiredIdParam } = require('./commonSchemas');

const listProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['created_at', 'price', 'name']).default('created_at'),
  sortOrder: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.toLowerCase() : val))
    .pipe(z.enum(['asc', 'desc']))
    .default('desc'),
});

const productIdParamSchema = requiredIdParam('productId');
const categoryIdParamSchema = requiredIdParam('categoryId');

const createProductBodySchema = z.object({
  sku: z
    .string({ required_error: "Поле 'sku' обязательно для заполнения" })
    .trim()
    .min(1, { message: "Поле 'sku' обязательно для заполнения" })
    .max(64, { message: "Длина поля 'sku' не должна превышать 64 символов" }),
  name: z
    .string({ required_error: "Поле 'name' обязательно для заполнения" })
    .trim()
    .min(1, { message: "Поле 'name' обязательно для заполнения" })
    .max(255, { message: "Длина поля 'name' не должна превышать 255 символов" }),
  description: z.string().trim().nullable().optional().default(null),
  price: z
    .number({
      required_error: "Поле 'price' обязательно для заполнения",
      invalid_type_error: "Поле 'price' должно быть числом",
    })
    .min(0, { message: "Значение поля 'price' должно быть не меньше 0" }),
  isActive: z.boolean().optional().default(true),
  imageUrl: z.string().trim().nullable().optional().default(null),
  categoryIds: z.array(z.string().trim()).optional().default([]),
});

const updateProductBodySchema = z.object({
  sku: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().nullable().optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  categoryIds: z.array(z.string().trim()).optional(),
});

const createCategoryBodySchema = z.object({
  name: z
    .string({ required_error: "Поле 'name' обязательно для заполнения" })
    .trim()
    .min(1, { message: "Поле 'name' обязательно для заполнения" })
    .max(255, { message: "Длина поля 'name' не должна превышать 255 символов" }),
  parentId: z.string().trim().nullable().optional().default(null),
});

const updateCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  parentId: z.string().trim().nullable().optional(),
});

module.exports = {
  listProductsQuerySchema,
  productIdParamSchema,
  categoryIdParamSchema,
  createProductBodySchema,
  updateProductBodySchema,
  createCategoryBodySchema,
  updateCategoryBodySchema,
};
