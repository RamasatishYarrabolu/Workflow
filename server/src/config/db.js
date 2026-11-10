const mongoose = require('mongoose');
const env = require('./env');

async function connectDatabase() {
  if (env.mongoUri) {
    try { await mongoose.connect(env.mongoUri); console.log('MongoDB connected'); return; }
    catch (error) { if (env.nodeEnv === 'production') throw error; console.warn(`MongoDB unavailable (${error.message}); trying in-memory database.`); }
  }
  if (env.nodeEnv === 'production') throw new Error('MONGODB_URI is required in production.');
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri());
    global.agentflowMemoryMongo = memory;
    console.log('In-memory MongoDB started');
  } catch (error) {
    throw new Error(`Database unavailable. Configure MONGODB_URI or install the in-memory MongoDB binary. ${error.message}`);
  }
}

module.exports = { connectDatabase };
