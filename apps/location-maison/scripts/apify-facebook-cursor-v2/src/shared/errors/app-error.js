class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || 'APP_ERROR';
    this.status = options.status || 500;
    this.details = options.details || null;
  }
}

module.exports = { AppError };
