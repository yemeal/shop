const { NotFoundError } = require('../errors');

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description ?? null,
    price: Number(row.price),
    isActive: Boolean(row.is_active),
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    name: row.name,
    productCount: Number(row.product_count || 0),
    createdAt: row.created_at,
  };
}

function mapOrderSummary(row) {
  if (!row) return null;
  const summary = {
    id: row.id,
    userId: row.user_id,
    deliveryAddressId: row.delivery_address_id,
    status: row.status,
    total: Number(row.total || 0),
    itemsCount: Number(row.items_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.user_email) {
    summary.user = {
      id: row.user_id,
      email: row.user_email,
      firstName: row.user_first_name ?? null,
      lastName: row.user_last_name ?? null,
    };
  }
  return summary;
}

function mapAddress(row) {
  if (!row) return null;
  return {
    id: row.address_id || row.delivery_address_id || row.id,
    country: row.country,
    city: row.city,
    street: row.street,
    house: row.house,
    apartment: row.apartment ?? null,
  };
}

function mapCartItem(row) {
  if (!row) return null;
  const unitPrice = Number(row.price || 0);
  const qty = Number(row.quantity || 0);
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    price: unitPrice,
    quantity: qty,
    lineTotal: unitPrice * qty,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
  };
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    role: row.role || 'user',
    createdAt: row.created_at,
  };
}

/**
 * проверка существования пользователя
 * @param {Object} userRepository
 * @param {string} userId
 */
async function ensureUser(userRepository, userId) {
  const exists = await userRepository.exists(userId);
  if (!exists) {
    throw new NotFoundError('Пользователь', { userId });
  }
}

module.exports = {
  mapProduct,
  mapCategory,
  mapOrderSummary,
  mapAddress,
  mapCartItem,
  mapUser,
  ensureUser,
};
