const AppError = require('../utils/AppError');
const integrations = require('../services/integrationService');
async function execute(node, context, owner) {
  const config = node.data?.config || {};
  if (['manual_trigger', 'webhook_trigger'].includes(node.type)) return context.input;
  if (node.type === 'ai_prompt') return integrations.runAI(config.prompt || '', context, owner);
  if (['gmail_send', 'gmail_read', 'slack_message', 'discord_message', 'sheets_append', 'sheets_read'].includes(node.type)) return integrations.executeProvider(node.type, config, context, owner);
  if (node.type === 'condition') { const result = Boolean(context[node.data?.config?.field]); return { result, branch: result ? 'true' : 'false' }; }
  if (node.type === 'delay') { const ms = Math.min(Number(config.ms || 0), 30000); await new Promise((resolve) => setTimeout(resolve, ms)); return { delayedMs: ms }; }
  throw new AppError(`Unsupported node type: ${node.type}`, 400, 'UNSUPPORTED_NODE');
}
module.exports = { execute };
