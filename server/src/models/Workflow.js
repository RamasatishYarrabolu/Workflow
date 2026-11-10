const mongoose = require('mongoose');
const workflowSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 }, description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },
  trigger: { type: mongoose.Schema.Types.Mixed, default: { type: 'manual', config: {} } },
  nodes: { type: [mongoose.Schema.Types.Mixed], default: [] }, edges: { type: [mongoose.Schema.Types.Mixed], default: [] },
  tags: { type: [String], default: [] }, version: { type: Number, default: 1 }, lastExecutedAt: Date
}, { timestamps: true });
module.exports = mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);
