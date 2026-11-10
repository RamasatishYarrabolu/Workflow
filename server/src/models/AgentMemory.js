const mongoose = require('mongoose');
const schema = new mongoose.Schema({ workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', index: true }, execution: { type: mongoose.Schema.Types.ObjectId, ref: 'Execution', index: true }, agent: { type: String, required: true }, key: { type: String, required: true }, value: mongoose.Schema.Types.Mixed, confidence: Number }, { timestamps: true });
module.exports = mongoose.models.AgentMemory || mongoose.model('AgentMemory', schema);
