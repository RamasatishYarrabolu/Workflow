module.exports = (err, _req, res, _next) => {
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Internal server error.' : err.message, code: err.code, errors: err.errors });
};
