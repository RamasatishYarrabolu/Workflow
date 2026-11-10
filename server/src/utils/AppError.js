class AppError extends Error {
  constructor(message, statusCode = 500, code) { super(message); this.statusCode = statusCode; this.code = code; this.isOperational = true; }
}
module.exports = AppError;
