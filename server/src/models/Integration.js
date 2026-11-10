const mongoose = require('mongoose');
const schema = new mongoose.Schema({ owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, provider: { type: String, enum: ['gmail', 'slack', 'discord', 'google-sheets', 'openrouter', 'gemini'], required: true }, status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' }, scopes: [String], accessToken: String, refreshToken: String, expiresAt: Date, account: mongoose.Schema.Types.Mixed, lastError: String }, { timestamps: true });
schema.index({ owner: 1, provider: 1 }, { unique: true });
module.exports = mongoose.models.Integration || mongoose.model('Integration', schema);
