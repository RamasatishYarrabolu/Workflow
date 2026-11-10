const service = require('../services/integrationService'); const AppError = require('../utils/AppError');
exports.list = async (req, res) => res.json(await service.list(req.user.id));
exports.status = async (req, res) => { const data = await service.list(req.user.id); res.json({ providers: data.providers.map((item) => ({ ...item, configured: item.status === 'connected' })) }); };
exports.start = async (req, res) => res.json({ authorizationUrl: service.startOAuth(req.user.id, req.params.provider) });
exports.callback = async (req, res) => { try { await service.callback(req.params.provider, req.query.code, req.query.state); res.redirect(`${require('../config/env').clientUrl}/integrations?connected=${encodeURIComponent(req.params.provider)}`); } catch (error) { res.redirect(`${require('../config/env').clientUrl}/integrations?error=${encodeURIComponent(error.code || error.message)}`); } };
exports.oauthError = async (req, res) => { throw new AppError(`OAuth failed: ${String(req.query.error_description || req.query.error || 'unknown provider error')}`, 400, 'OAUTH_FAILED'); };
exports.save = async (req, res) => res.status(200).json(await service.saveManual(req.user.id, req.body.provider, req.body));
exports.disconnect = async (req, res) => { const Integration = require('../models/Integration'); await Integration.findOneAndUpdate({ owner: req.user.id, provider: req.params.provider }, { status: 'disconnected', accessToken: undefined, refreshToken: undefined, expiresAt: undefined }); res.json({ provider: req.params.provider, status: 'disconnected' }); };
exports.slackEvents = async (req, res) => {
  const crypto = require('crypto'); const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return res.status(503).json({ message: 'Slack event verification is not configured.' });
  const timestamp = req.get('x-slack-request-timestamp') || ''; const signature = req.get('x-slack-signature') || '';
  if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !req.rawBody) return res.status(401).json({ message: 'Invalid Slack event signature.' });
  const expected = `v0=${crypto.createHmac('sha256', secret).update(`v0:${timestamp}:`).update(req.rawBody).digest('hex')}`;
  const actualBuffer = Buffer.from(signature); const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return res.status(401).json({ message: 'Invalid Slack event signature.' });
  if (req.body.type === 'url_verification') return res.json({ challenge: req.body.challenge });
  if (req.body.type === 'event_callback') {
    const Integration = require('../models/Integration'); const Notification = require('../models/Notification'); const { emitUserEvent } = require('../config/socket');
    const connections = await Integration.find({ provider: 'slack', status: 'connected', 'account.id': req.body.team_id });
    const event = req.body.event || {};
    for (const connection of connections) { const notification = await Notification.create({ owner: connection.owner, type: 'info', title: 'Slack event received', message: `Slack ${event.type || 'event'} in ${event.channel || 'workspace'}.` }); emitUserEvent(String(connection.owner), notification.toObject()); }
  }
  return res.json({ ok: true });
};
