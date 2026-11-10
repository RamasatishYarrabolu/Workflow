const Workflow = require('../models/Workflow');
const Execution = require('../models/Execution');
const ExecutionLog = require('../models/ExecutionLog');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { enqueue } = require('../queues/executionQueue');
const { emitExecutionEvent, emitUserEvent } = require('../config/socket');

async function event(run, agent, eventType, message, options = {}) {
  const entry = await ExecutionLog.create({ execution: run._id, workflow: run.workflow, nodeId: options.nodeId, agent, eventType, message, level: options.level || 'info', metadata: options.metadata || {} });
  const payload = entry.toObject(); emitExecutionEvent(String(run._id), { ...payload, createdAt: entry.createdAt }); return entry;
}
async function notify(owner, data) { const notification = await Notification.create({ owner, ...data }); emitUserEvent(String(owner), notification.toObject()); return notification; }
async function start(owner, id, input = {}) {
  const workflow = await Workflow.findOne({ _id: id, owner });
  if (!workflow) throw new AppError('Workflow not found.', 404, 'NOT_FOUND');
  if (!workflow.nodes.length) throw new AppError('Add at least one node before executing this workflow.', 400, 'INVALID_WORKFLOW');
  const run = await Execution.create({ workflow: workflow._id, owner, workflowSnapshot: workflow.toObject(), status: 'PENDING', input, startedAt: new Date() });
  await event(run, 'monitoring', 'execution.queued', 'Execution queued.', { metadata: { status: run.status } });
  await enqueue(String(run._id));
  return run;
}
async function ownedRun(owner, id) { const run = await Execution.findOne({ _id: id, owner }).populate('workflow', 'name'); if (!run) throw new AppError('Execution not found.', 404, 'NOT_FOUND'); return run; }
async function list(owner, query) {
  const page = Math.max(1, Number(query.page) || 1), limit = Math.min(100, Math.max(1, Number(query.limit) || 20)); const filter = { owner };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([Execution.find(filter).populate('workflow', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Execution.countDocuments(filter)]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}
async function detail(owner, id) { const run = await ownedRun(owner, id); const logs = await ExecutionLog.find({ execution: id }).sort({ createdAt: 1 }); return { execution: run, logs }; }
async function timeline(owner, id) { await ownedRun(owner, id); return ExecutionLog.find({ execution: id }).sort({ createdAt: 1 }); }
async function control(owner, id, action) {
  const run = await ownedRun(owner, id);
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) throw new AppError(`Cannot ${action} a ${run.status.toLowerCase()} execution.`, 409, 'INVALID_STATE');
  if (action === 'pause' && run.status === 'RUNNING') run.status = 'PAUSED';
  if (action === 'resume' && run.status === 'PAUSED') { run.status = 'PENDING'; run.control = null; await enqueue(String(run._id)); }
  if (action === 'cancel') { run.status = 'CANCELLED'; run.control = 'cancel'; }
  if (action === 'pause') run.control = 'pause';
  await run.save(); const eventName = { pause: 'execution.paused', resume: 'execution.resumed', cancel: 'execution.cancelled' }[action]; await event(run, 'monitoring', eventName, `Execution ${action} requested.`, { level: 'warning' }); return run;
}
async function retry(owner, id) {
  const previous = await ownedRun(owner, id);
  const run = await Execution.create({ workflow: previous.workflow._id || previous.workflow, owner, workflowSnapshot: previous.workflowSnapshot, input: previous.input, status: 'PENDING', retryCount: previous.retryCount + 1, startedAt: new Date() });
  await event(run, 'monitoring', 'execution.retry_queued', 'A retry execution was queued.', { metadata: { sourceExecutionId: String(previous._id) } }); await enqueue(String(run._id)); return run;
}
module.exports = { event, notify, start, list, detail, timeline, control, retry, Notification };
