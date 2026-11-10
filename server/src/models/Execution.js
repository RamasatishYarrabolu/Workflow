const mongoose = require('mongoose');
const executionSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true }, owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workflowSnapshot: { type: mongoose.Schema.Types.Mixed, required: true }, status: { type: String, enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'PAUSED', 'CANCELLED'], default: 'PENDING', index: true }, langGraph: { type: String, enum: ['available', 'not-installed'], default: 'not-installed' },
  currentNodeId: String, completedNodeIds: { type: [String], default: [] }, input: mongoose.Schema.Types.Mixed, output: mongoose.Schema.Types.Mixed, error: mongoose.Schema.Types.Mixed,
  startedAt: Date, completedAt: Date, durationMs: Number, retryCount: { type: Number, default: 0 }, control: { type: String, enum: ['pause', 'resume', 'cancel'], default: null }
}, { timestamps: true });
module.exports = mongoose.models.Execution || mongoose.model('Execution', executionSchema);
