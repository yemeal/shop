class NotImplementedError extends Error {
  constructor(methodName) {
    super(`Метод '${methodName}' должен быть реализован`);
    this.name = 'NotImplementedError';
  }
}

class BaseRepository {}

module.exports = {
  BaseRepository,
  NotImplementedError,
};
