const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

const catalog = [
  { type: 'manual_trigger', group: 'triggers', label: 'Manual Trigger', description: 'Start a workflow on demand.' },
  { type: 'webhook_trigger', group: 'triggers', label: 'Webhook Trigger', description: 'Start from an incoming webhook.' },
  { type: 'gmail_send', group: 'actions', label: 'Send Email', description: 'Send an email with Gmail.' },
  { type: 'gmail_read', group: 'actions', label: 'Read Email', description: 'Search and read Gmail messages.' },
  { type: 'slack_message', group: 'actions', label: 'Post Slack Message', description: 'Post a message to Slack.' },
  { type: 'discord_message', group: 'actions', label: 'Post Discord Message', description: 'Post a bot message to Discord.' },
  { type: 'sheets_append', group: 'actions', label: 'Append Sheet Row', description: 'Append a row to Google Sheets.' },
  { type: 'sheets_read', group: 'actions', label: 'Read Sheet Range', description: 'Read a range from Google Sheets.' },
  { type: 'ai_prompt', group: 'ai', label: 'AI Prompt', description: 'Transform data with an AI model.' },
  { type: 'condition', group: 'logic', label: 'Condition', description: 'Branch based on a condition.' },
  { type: 'delay', group: 'logic', label: 'Delay', description: 'Wait for a configured duration.' }
];
const node = (id, type, label, x, y, config = {}) => ({ id, type, position: { x, y }, data: { label, config } });

function deterministic(prompt) {
  const p = prompt.toLowerCase();
  let action;
  if (/invoice|sheet|spreadsheet|row|append/.test(p)) action = node('action-1', 'sheets_append', 'Append to Google Sheets', 260, 180, { spreadsheetId: '', range: 'Sheet1!A:Z', values: [] });
  else if (/discord/.test(p)) action = node('action-1', 'discord_message', 'Send Discord Message', 260, 180, { channelId: '', message: '' });
  else if (/slack/.test(p)) action = node('action-1', 'slack_message', 'Send Slack Message', 260, 180, { channel: '', message: '' });
  else if (/email|mail|gmail/.test(p)) action = node('action-1', 'gmail_send', 'Send Email', 260, 180, { to: '', subject: '', body: '' });
  else action = node('action-1', 'ai_prompt', 'Process with AI', 260, 180, { prompt: 'Process the incoming data and return a concise result.' });
  const trigger = node('trigger-1', 'manual_trigger', 'Manual Trigger', 0, 180, {});
  return { name: (prompt.trim().slice(0, 60) || 'Generated workflow'), description: prompt, trigger: { type: 'manual', config: {} }, nodes: [trigger, action], edges: [{ id: 'edge-1', source: trigger.id, target: action.id, animated: true }], tags: ['ai-generated'], version: 1 };
}

function validateWorkflow(value, prompt) {
  if (!value || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || value.nodes.length < 1) throw new Error('AI returned an invalid workflow graph.');
  const ids = new Set();
  value.nodes = value.nodes.map((item, index) => {
    const id = String(item.id || `node-${index + 1}`); ids.add(id);
    return { id, type: String(item.type || 'ai_prompt'), position: item.position || { x: index * 260, y: 120 }, data: { label: item.data?.label || item.label || item.type || 'Workflow step', config: item.data?.config || item.config || {} } };
  });
  value.edges = value.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge, i) => ({ id: edge.id || `edge-${i + 1}`, source: edge.source, target: edge.target, animated: true }));
  value.name = String(value.name || prompt.slice(0, 60) || 'Generated workflow'); value.description = String(value.description || prompt); value.trigger ||= { type: 'manual', config: {} }; value.tags ||= ['ai-generated']; value.version = 1;
  return value;
}

async function generate(prompt) {
  if (env.openRouterApiKey) {
    const client = new OpenAI({ apiKey: env.openRouterApiKey, baseURL: 'https://openrouter.ai/api/v1' });
    try {
      const response = await client.chat.completions.create({ model: env.openRouterModel, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: `Create an executable workflow JSON. Use node types from this catalog: ${catalog.map((x) => x.type).join(', ')}. Return {name,description,trigger,nodes:[{id,type,position:{x,y},data:{label,config}}],edges:[{id,source,target}],tags}.` }, { role: 'user', content: prompt }] });
      return { workflow: validateWorkflow(JSON.parse(response.choices[0].message.content), prompt), provider: 'openrouter' };
    } catch (error) { if (!env.geminiApiKey) throw error; }
  }
  if (env.geminiApiKey) {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey); const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });
    const result = await model.generateContent(`Create an executable workflow JSON. Node types: ${catalog.map((x) => x.type).join(', ')}. Return {name,description,trigger,nodes:[{id,type,position:{x,y},data:{label,config}}],edges:[{id,source,target}],tags}. Prompt: ${prompt}`);
    return { workflow: validateWorkflow(JSON.parse(result.response.text()), prompt), provider: 'gemini' };
  }
  return { workflow: deterministic(prompt), provider: 'deterministic' };
}
module.exports = { generate, deterministic, catalog };
