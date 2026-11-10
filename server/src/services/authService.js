const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function issueToken(user) { return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn }); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }

async function register({ name, email, password }) {
  if (await User.exists({ email: email.toLowerCase() })) throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
  return { user: publicUser(user), token: issueToken(user) };
}
async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  user.lastLoginAt = new Date(); await user.save();
  return { user: publicUser(user), token: issueToken(user) };
}
module.exports = { register, login, publicUser };
