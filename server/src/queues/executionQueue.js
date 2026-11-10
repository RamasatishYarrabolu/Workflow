const env = require('../config/env');
let queue;
const pending = [];
const listeners = new Set();

async function enqueue(executionId) {
  if (env.redisUrl) {
    if (!queue) { const { Queue } = require('bullmq'); const IORedis = require('ioredis'); const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null }); queue = new Queue('agentflow-executions', { connection }); }
    await queue.add('execute', { executionId }, { attempts: 3, backoff: { type: 'exponential', delay: 1500 }, removeOnComplete: 500, removeOnFail: 1000 });
  } else { pending.push(executionId); for (const listener of listeners) setImmediate(() => listener()); }
}
function take() { return pending.shift(); }
function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
async function initializeWorker() {
  const { runExecution } = require('../agents/orchestrator');
  if (env.redisUrl) {
    const { Worker } = require('bullmq'); const IORedis = require('ioredis'); const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
    new Worker('agentflow-executions', (job) => runExecution(job.data.executionId), { connection, concurrency: 5 });
    return;
  }
  let active = 0;
  const drain = async () => {
    while (active < 3) { const id = take(); if (!id) break; active++; runExecution(id).catch((error) => console.error('Execution worker failed:', error)).finally(() => { active--; drain(); }); }
  };
  subscribe(drain);
}
module.exports = { enqueue, take, subscribe, initializeWorker };
