const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

module.exports = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret); } catch { throw new AppError('Session is invalid or expired.', 401, 'UNAUTHORIZED'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new AppError('Account is unavailable.', 401, 'UNAUTHORIZED');
  req.user = user;
  next();
});
