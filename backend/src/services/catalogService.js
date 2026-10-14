const { randomUUID } = require('node:crypto');
const { NotFoundError } = require('../errors');
const { mapCategory, mapProduct } = require('./shared');

/**
 * создание сервиса каталога
 *
 * @param {Object} deps
 * @param {import('../repositories/interfaces/IProductRepository').IProductRepository} deps.productRepository
 * @param {import('../repositories/interfaces/ICategoryRepository').ICategoryRepository} deps.categoryRepository
 */
function createCatalogService({ productRepository, categoryRepository, transactionManager = null }) {
  if (!productRepository || !categoryRepository) {
    throw new Error('CatalogService требует productRepository и categoryRepository');
  }

  const runInTx = transactionManager
    ? (cb) => transactionManager.runInTransaction(cb)
    : (cb) => cb(null);

  async function listProducts(filter = {}) {
    const limit = filter.limit !== undefined ? Number(filter.limit) : 50;
    const offset = filter.offset !== undefined ? Number(filter.offset) : 0;

    const { items, total } = await productRepository.listProducts({
      search: filter.search,
      categoryId: filter.categoryId,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
      limit,
      offset,
    });

    return {
      items: items.map(mapProduct),
      total,
      limit,
      offset,
    };
  }

  async function getProduct(productId) {
    const product = await productRepository.findActiveById(productId);
    if (!product) {
      throw new NotFoundError('Товар', { productId });
    }

    const categories = await productRepository.getCategoriesForProduct(productId);
    return {
      ...mapProduct(product),
      categories: categories.map((cat) => ({ id: cat.id, name: cat.name })),
    };
  }

  async function listCategories({ limit = 50, offset = 0 } = {}) {
    const [rows, total] = await Promise.all([
      categoryRepository.listCategories({ limit, offset }),
      categoryRepository.countCategories(),
    ]);

    return {
      items: rows.map(mapCategory),
      total,
      limit,
      offset,
    };
  }

  async function listCategoryProducts(categoryId, pagination = {}) {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Категория', { categoryId });
    }

    return listProducts({
      categoryId,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  // административные методы управления каталогом
  async function createProduct(input) {
    const id = randomUUID();
    let product;
    await runInTx(async (trx) => {
      product = await productRepository.createProduct(
        {
          id,
          sku: input.sku,
          name: input.name,
          description: input.description ?? null,
          price: input.price,
          isActive: input.isActive ?? true,
          imageUrl: input.imageUrl ?? null,
        },
        input.categoryIds || [],
        trx,
      );
    });

    const categories = await productRepository.getCategoriesForProduct(id);
    return {
      ...mapProduct(product),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    };
  }

  async function updateProduct(id, input) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Товар', { productId: id });
    }

    let updated;
    await runInTx(async (trx) => {
      updated = await productRepository.updateProduct(id, input, input.categoryIds, trx);
    });

    const categories = await productRepository.getCategoriesForProduct(id);
    return {
      ...mapProduct(updated),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    };
  }

  async function deleteProduct(id) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Товар', { productId: id });
    }
    await productRepository.deleteProduct(id);
  }

  async function createCategory(input) {
    const id = randomUUID();
    const category = await categoryRepository.createCategory({
      id,
      name: input.name,
      parentId: input.parentId || null,
    });
    return mapCategory(category);
  }

  async function deleteCategory(id) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Категория', { categoryId: id });
    }
    await categoryRepository.deleteCategory(id);
  }

  return {
    listProducts,
    getProduct,
    listCategories,
    listCategoryProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    deleteCategory,
  };
}

module.exports = { createCatalogService };
