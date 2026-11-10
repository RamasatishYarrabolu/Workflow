const service = require('../services/executionService');
exports.list = async (req, res) => res.json(await service.list(req.user.id, req.query));
exports.start = async (req, res) => res.status(202).json(await service.start(req.user.id, req.params.id, req.body.input || {}));
exports.detail = async (req, res) => res.json(await service.detail(req.user.id, req.params.id));
exports.timeline = async (req, res) => res.json(await service.timeline(req.user.id, req.params.id));
exports.pause = async (req, res) => res.json(await service.control(req.user.id, req.params.id, 'pause'));
exports.resume = async (req, res) => res.json(await service.control(req.user.id, req.params.id, 'resume'));
exports.cancel = async (req, res) => res.json(await service.control(req.user.id, req.params.id, 'cancel'));
exports.retry = async (req, res) => res.status(202).json(await service.retry(req.user.id, req.params.id));
