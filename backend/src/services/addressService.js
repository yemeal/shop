const { randomUUID } = require('node:crypto');
const { NotFoundError, ValidationError, ConflictError } = require('../errors');
const { ensureUser, mapAddress } = require('./shared');

/**
 * Создание сервиса управления адресами доставки пользователей
 *
 * @param {Object} deps
 * @param {Object} deps.addressRepository
 * @param {Object} deps.userRepository
 * @param {Object} [deps.transactionManager]
 */
function createAddressService({ addressRepository, userRepository, transactionManager = null }) {
  if (!addressRepository || !userRepository) {
    throw new Error('AddressService требует addressRepository и userRepository');
  }

  const runInTx = transactionManager
    ? (cb) => transactionManager.runInTransaction(cb)
    : (cb) => cb(null);

  /**
   * Получение списка всех адресов пользователя
   *
   * @param {string} userId
   * @returns {Promise<Array<Object>>}
   */
  async function listAddresses(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Поле userId обязательно');
    }

    await ensureUser(userRepository, userId);

    const rows = await addressRepository.listByUserId(userId);
    return rows.map(mapAddress);
  }

  /**
   * Получение адреса по ID с проверкой принадлежности пользователю
   *
   * @param {string} userId
   * @param {string} addressId
   * @returns {Promise<Object>}
   */
  async function getAddress(userId, addressId) {
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Поле userId обязательно');
    }
    if (!addressId || typeof addressId !== 'string') {
      throw new ValidationError('Поле addressId обязательно');
    }

    await ensureUser(userRepository, userId);

    const address = await addressRepository.findByIdAndUserId(addressId, userId);
    if (!address) {
      throw new NotFoundError('Адрес', { userId, addressId });
    }

    return mapAddress(address);
  }

  /**
   * Добавление нового адреса пользователя
   *
   * @param {string} userId
   * @param {Object} input
   * @returns {Promise<Object>}
   */
  async function createAddress(userId, input) {
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Поле userId обязательно');
    }
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Данные адреса должны быть объектом');
    }

    await ensureUser(userRepository, userId);

    const country =
      input.country !== undefined && input.country !== null && String(input.country).trim() !== ''
        ? String(input.country).trim()
        : 'Россия';
    const city = input.city !== undefined && input.city !== null ? String(input.city).trim() : '';
    const street =
      input.street !== undefined && input.street !== null ? String(input.street).trim() : '';
    const house =
      input.house !== undefined && input.house !== null ? String(input.house).trim() : '';
    const apartment =
      input.apartment !== undefined &&
      input.apartment !== null &&
      String(input.apartment).trim() !== ''
        ? String(input.apartment).trim()
        : null;

    if (!city || !street || !house) {
      throw new ValidationError('Поля city, street и house обязательны для заполнения');
    }

    const id = 'addr-' + randomUUID();

    const created = await runInTx(async () => {
      return addressRepository.createAddress({
        id,
        userId,
        country,
        city,
        street,
        house,
        apartment,
      });
    });

    return mapAddress(created);
  }

  /**
   * Удаление адреса пользователя
   *
   * @param {string} userId
   * @param {string} addressId
   * @returns {Promise<void>}
   */
  async function deleteAddress(userId, addressId) {
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Поле userId обязательно');
    }
    if (!addressId || typeof addressId !== 'string') {
      throw new ValidationError('Поле addressId обязательно');
    }

    await ensureUser(userRepository, userId);

    const existing = await addressRepository.findByIdAndUserId(addressId, userId);
    if (!existing) {
      throw new NotFoundError('Адрес', { userId, addressId });
    }

    try {
      await runInTx(async () => {
        if (typeof addressRepository.deleteAddress === 'function') {
          await addressRepository.deleteAddress(addressId, userId);
        }
      });
    } catch (err) {
      if (
        err.code === 'SQLITE_CONSTRAINT' ||
        (typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT_'))
      ) {
        throw new ConflictError('Нельзя удалить адрес, который привязан к существующим заказам');
      }
      throw err;
    }
  }

  return {
    listAddresses,
    listByUserId: listAddresses,
    getAddress,
    createAddress,
    deleteAddress,
    removeAddress: deleteAddress,
  };
}

module.exports = { createAddressService };
