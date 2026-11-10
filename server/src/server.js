const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/db');
const { initializeSocket } = require('./config/socket');

async function start() {
  await connectDatabase();
  const server = http.createServer(app);
  initializeSocket(server);
  await require('./queues/executionQueue').initializeWorker();
  server.listen(env.port, () => console.log(`Agentflow API listening on port ${env.port}`));
  const shutdown = async () => { server.close(); const memory = global.agentflowMemoryMongo; if (memory) await memory.stop(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
start().catch((error) => { console.error(error); process.exit(1); });
