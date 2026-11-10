const jwt = require('jsonwebtoken'); const Integration = require('../models/Integration'); const { encrypt, decrypt } = require('./credentialService'); const env = require('../config/env'); const AppError = require('../utils/AppError');
const configs = {
  gmail: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/integrations/oauth/gmail/callback', authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'] },
  'google-sheets': { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, redirectUri: process.env.GOOGLE_SHEETS_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/integrations/oauth/google-sheets/callback', authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
  slack: { clientId: process.env.SLACK_CLIENT_ID, clientSecret: process.env.SLACK_CLIENT_SECRET, redirectUri: process.env.SLACK_REDIRECT_URI, authorize: 'https://slack.com/oauth/v2/authorize', token: 'https://slack.com/api/oauth.v2.access', scopes: ['chat:write', 'channels:read', 'channels:history', 'groups:read', 'groups:history'] },
  discord: { clientId: process.env.DISCORD_CLIENT_ID, clientSecret: process.env.DISCORD_CLIENT_SECRET, redirectUri: process.env.DISCORD_REDIRECT_URI, authorize: 'https://discord.com/oauth2/authorize', token: 'https://discord.com/api/oauth2/token', scopes: ['identify', 'bot'], extra: { permissions: '2048' } }
};
const allowed = Object.keys(configs);
const allProviders = [...allowed, 'openrouter', 'gemini'];
function validateProvider(provider) { if (!allowed.includes(provider)) throw new AppError('Unsupported OAuth provider.', 400, 'UNSUPPORTED_PROVIDER'); }
function publicRecord(item) { return { id: item.id, provider: item.provider, status: item.status, scopes: item.scopes, expiresAt: item.expiresAt, account: item.account, lastError: item.lastError, updatedAt: item.updatedAt, hasAccessToken: Boolean(item.accessToken), hasRefreshToken: Boolean(item.refreshToken) }; }
async function list(owner) { const records = await Integration.find({ owner }); return { integrations: records.map(publicRecord), providers: allProviders.map((provider) => ({ provider, status: records.find((r) => r.provider === provider)?.status || 'disconnected' })) }; }
function startOAuth(owner, provider) {
  validateProvider(provider); const config = configs[provider]; if (!config.clientId || !config.redirectUri) throw new AppError(`${provider} OAuth is not configured.`, 503, 'OAUTH_NOT_CONFIGURED');
  const state = jwt.sign({ sub: String(owner), provider, purpose: 'integration-oauth' }, env.jwtSecret, { expiresIn: '10m' }); const url = new URL(config.authorize);
  url.searchParams.set('client_id', config.clientId); url.searchParams.set('redirect_uri', config.redirectUri); url.searchParams.set('response_type', 'code'); url.searchParams.set('scope', config.scopes.join(' ')); url.searchParams.set('state', state);
  if (provider === 'gmail' || provider === 'google-sheets') { url.searchParams.set('access_type', 'offline'); url.searchParams.set('prompt', 'consent'); }
  if (provider === 'slack') url.searchParams.set('user_scope', '');
  Object.entries(config.extra || {}).forEach(([key, value]) => url.searchParams.set(key, value)); return url.toString();
}
async function callback(provider, code, state) {
  validateProvider(provider); let payload;
  try { payload = jwt.verify(state, env.jwtSecret); } catch { throw new AppError('OAuth state is invalid or expired.', 400, 'INVALID_OAUTH_STATE'); }
  if (payload.provider !== provider || payload.purpose !== 'integration-oauth') throw new AppError('OAuth state does not match provider.', 400, 'INVALID_OAUTH_STATE');
  const config = configs[provider]; if (!config.clientId || !config.clientSecret) throw new AppError(`${provider} OAuth is not configured.`, 503, 'OAUTH_NOT_CONFIGURED');
  const tokenResponse = await fetch(config.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(provider === 'slack' ? {} : {}) }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: 'authorization_code' }) });
  const tokens = await tokenResponse.json(); if (!tokenResponse.ok || tokens.ok === false) throw new AppError(tokens.error_description || tokens.error || 'OAuth token exchange failed.', 400, 'OAUTH_FAILED');
  const access = tokens.access_token || tokens.authed_user?.access_token; if (!access) throw new AppError('Provider did not return an access token.', 400, 'OAUTH_FAILED');
  const account = tokens.team ? { id: tokens.team.id, name: tokens.team.name } : tokens.bot ? { id: tokens.bot.bot_user_id, name: tokens.team?.name } : {};
  const record = await Integration.findOneAndUpdate({ owner: payload.sub, provider }, { owner: payload.sub, provider, status: 'connected', scopes: (tokens.scope || config.scopes.join(' ')).split(/[ ,]+/), accessToken: encrypt(access), refreshToken: encrypt(tokens.refresh_token || tokens.authed_user?.refresh_token), expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined, account, lastError: undefined }, { upsert: true, new: true, runValidators: true });
  return publicRecord(record);
}
async function saveManual(owner, provider, { accessToken, refreshToken, scopes = [] }) {
  if (!allowed.includes(provider) && !['openrouter', 'gemini'].includes(provider)) throw new AppError('Unsupported integration provider.', 400, 'UNSUPPORTED_PROVIDER');
  if (!accessToken) throw new AppError('An access token is required.', 400, 'MISSING_FIELDS');
  const item = await Integration.findOneAndUpdate({ owner, provider }, { owner, provider, status: 'connected', accessToken: encrypt(accessToken), refreshToken: encrypt(refreshToken), scopes, lastError: undefined }, { upsert: true, new: true, runValidators: true }); return publicRecord(item);
}
async function credential(owner, provider) {
  const item = await Integration.findOne({ owner, provider });
  if (!item || item.status !== 'connected' || !item.accessToken) throw new AppError(`Connect ${provider} before running this step.`, 400, 'INTEGRATION_NOT_CONNECTED');
  if (item.expiresAt && item.expiresAt < new Date() && (!item.refreshToken || !['gmail', 'google-sheets'].includes(provider))) throw new AppError(`${provider} authorization expired. Reconnect the integration.`, 401, 'AUTH_EXPIRED');
  return { accessToken: decrypt(item.accessToken), refreshToken: decrypt(item.refreshToken), item };
}
async function refreshGoogle(owner, provider, auth) {
  const config = configs[provider]; if (!auth.refreshToken || !config.clientId || !config.clientSecret) throw new AppError(`${provider} authorization expired. Reconnect the integration.`, 401, 'AUTH_EXPIRED');
  const response = await fetch(config.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: auth.refreshToken, grant_type: 'refresh_token' }) }); const data = await response.json();
  if (!response.ok) throw new AppError('Authorization expired. Reconnect the integration.', 401, 'AUTH_EXPIRED');
  auth.item.accessToken = encrypt(data.access_token); auth.item.expiresAt = new Date(Date.now() + data.expires_in * 1000); await auth.item.save(); auth.accessToken = data.access_token; return auth;
}
async function request(url, token, init = {}) { const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } }); const data = await response.json().catch(() => ({})); if (response.status === 401) throw new AppError('Provider authorization expired. Reconnect the integration.', 401, 'AUTH_EXPIRED'); if (response.status === 429) throw new AppError('Provider rate limit exceeded.', 429, 'RATE_LIMIT'); if (!response.ok || data.ok === false) throw Object.assign(new AppError(data.error?.message || data.error || `Provider request failed (${response.status}).`, response.status || 400, 'API_FAILURE'), { status: response.status || 400 }); return data; }
async function executeProvider(type, config, context, owner) {
  const provider = type.startsWith('gmail_') ? 'gmail' : type.startsWith('sheets_') ? 'google-sheets' : type.startsWith('slack_') ? 'slack' : 'discord';
  let auth = await credential(owner, provider); if (['gmail', 'google-sheets'].includes(provider) && auth.item.expiresAt && auth.item.expiresAt < new Date()) auth = await refreshGoogle(owner, provider, auth);
  const token = auth.accessToken; const resolve = (value) => typeof value === 'string' ? value.replace(/\{\{input\.([\w.-]+)\}\}/g, (_, key) => String(key.split('.').reduce((obj, part) => obj?.[part], context.input) ?? '')).replace(/\{\{previous\}\}/g, JSON.stringify(context.previous ?? '')) : value;
  if (type === 'gmail_send') { const raw = [`To: ${resolve(config.to)}`, `Subject: ${resolve(config.subject)}`, 'Content-Type: text/plain; charset=utf-8', '', resolve(config.body)].join('\r\n'); const encoded = Buffer.from(raw).toString('base64url'); return request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', token, { method: 'POST', body: JSON.stringify({ raw: encoded }) }); }
  if (type === 'gmail_read') { const listed = await request(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(resolve(config.query || 'newer_than:7d'))}&maxResults=${Math.min(Number(config.maxResults || 10), 25)}`, token); const messages = await Promise.all((listed.messages || []).map((message) => request(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, token))); return { messages: messages.map((message) => ({ id: message.id, threadId: message.threadId, snippet: message.snippet, headers: message.payload?.headers || [] })) }; }
  if (type === 'sheets_append') { const spreadsheetId = resolve(config.spreadsheetId); if (!spreadsheetId) throw new AppError('Google Sheets spreadsheetId is required.', 400, 'MISSING_FIELDS'); const range = encodeURIComponent(resolve(config.range || 'Sheet1!A:Z')); const row = Array.isArray(context.previous) ? context.previous : Object.values(context.previous || {}); const values = config.values?.length ? resolve(config.values) : [row]; return request(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, token, { method: 'POST', body: JSON.stringify({ values }) }); }
  if (type === 'sheets_read') { const spreadsheetId = resolve(config.spreadsheetId); const cellRange = resolve(config.range); if (!spreadsheetId || !cellRange) throw new AppError('Google Sheets spreadsheetId and range are required.', 400, 'MISSING_FIELDS'); const range = encodeURIComponent(cellRange); return request(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`, token); }
  if (type === 'slack_message') return request('https://slack.com/api/chat.postMessage', token, { method: 'POST', body: JSON.stringify({ channel: resolve(config.channel), text: resolve(config.message || '{{previous}}') }) });
  if (type === 'discord_message') { const channel = resolve(config.channelId); if (!channel) throw new AppError('Discord channelId is required.', 400, 'MISSING_FIELDS'); const response = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channel)}/messages`, { method: 'POST', headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: resolve(config.message || '{{previous}}') }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new AppError(data.message || `Discord request failed (${response.status}).`, response.status, response.status === 401 ? 'AUTH_EXPIRED' : 'API_FAILURE'); return data; }
  throw new AppError(`Unsupported integration action ${type}`, 400, 'UNSUPPORTED_ACTION');
}
async function runAI(prompt, context, owner) {
  let openRouterKey = env.openRouterApiKey;
  if (!openRouterKey && owner) { try { openRouterKey = (await credential(owner, 'openrouter')).accessToken; } catch {} }
  if (openRouterKey) { const OpenAI = require('openai'); const client = new OpenAI({ apiKey: openRouterKey, baseURL: 'https://openrouter.ai/api/v1' }); const result = await client.chat.completions.create({ model: env.openRouterModel, messages: [{ role: 'user', content: `${prompt}\n\nInput: ${JSON.stringify(context.input)}\nPrevious step: ${JSON.stringify(context.previous)}` }] }); return { text: result.choices[0].message.content, provider: 'openrouter' }; }
  let geminiKey = env.geminiApiKey;
  if (!geminiKey && owner) { try { geminiKey = (await credential(owner, 'gemini')).accessToken; } catch {} }
  if (geminiKey) { const { GoogleGenerativeAI } = require('@google/generative-ai'); const model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: 'gemini-1.5-flash' }); const result = await model.generateContent(`${prompt}\nInput: ${JSON.stringify(context.input)}\nPrevious step: ${JSON.stringify(context.previous)}`); return { text: result.response.text(), provider: 'gemini' }; }
  throw new AppError('AI provider is not configured.', 503, 'AI_NOT_CONFIGURED');
}
module.exports = { list, startOAuth, callback, saveManual, executeProvider, runAI, publicRecord, allowed, allProviders };
