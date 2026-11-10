const dotenv = require('dotenv');
dotenv.config();

const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY,
  redisUrl: process.env.REDIS_URL,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
  geminiApiKey: process.env.GEMINI_API_KEY
};

if (env.nodeEnv === 'production' && (env.jwtSecret.startsWith('development-') || !env.credentialEncryptionKey)) {
  throw new Error('JWT_SECRET and CREDENTIAL_ENCRYPTION_KEY must be configured in production.');
}
module.exports = env;
