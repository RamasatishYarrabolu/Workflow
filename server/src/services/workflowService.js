const Workflow = require('../models/Workflow');
const Execution = require('../models/Execution');
const AppError = require('../utils/AppError');

async function list(owner, { search = '', status, page = 1, limit = 20 } = {}) {
  const filter = { owner };
  if (search) { const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ name: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }, { tags: { $regex: escaped, $options: 'i' } }]; }
  if (status) filter.status = status;
  const [items, total] = await Promise.all([Workflow.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit), Workflow.countDocuments(filter)]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}
async function create(owner, input) { const fields = {}; for (const key of ['name', 'description', 'status', 'trigger', 'nodes', 'edges', 'tags']) if (input[key] !== undefined) fields[key] = input[key]; return Workflow.create({ ...fields, owner }); }
async function get(owner, id) { const item = await Workflow.findOne({ _id: id, owner }); if (!item) throw new AppError('Workflow not found.', 404, 'NOT_FOUND'); return item; }
async function update(owner, id, input) { const item = await get(owner, id); for (const key of ['name', 'description', 'status', 'trigger', 'nodes', 'edges', 'tags']) if (input[key] !== undefined) item[key] = input[key]; item.version += 1; await item.save(); return item; }
async function duplicate(owner, id) { const source = await get(owner, id); const copy = source.toObject(); delete copy._id; delete copy.createdAt; delete copy.updatedAt; return Workflow.create({ ...copy, owner, name: `${source.name} copy`, status: 'draft', version: 1 }); }
async function remove(owner, id) { const item = await get(owner, id); await item.deleteOne(); return { deleted: true }; }
async function dashboard(owner) {
  const [totalWorkflows, activeWorkflows, runs, recentWorkflows, recentExecutions] = await Promise.all([
    Workflow.countDocuments({ owner }), Workflow.countDocuments({ owner, status: 'active' }), Execution.find({ owner }).select('status'),
    Workflow.find({ owner }).sort({ updatedAt: -1 }).limit(6), Execution.find({ owner }).populate('workflow', 'name').sort({ createdAt: -1 }).limit(8)
  ]);
  const completed = runs.filter((run) => run.status === 'COMPLETED').length;
  const settled = runs.filter((run) => ['COMPLETED', 'FAILED'].includes(run.status)).length;
  return { totalWorkflows, activeWorkflows, totalExecutions: runs.length, successRate: settled ? Math.round(completed / settled * 100) : 0, recentWorkflows, recentExecutions };
}
module.exports = { list, create, get, update, duplicate, remove, dashboard };
