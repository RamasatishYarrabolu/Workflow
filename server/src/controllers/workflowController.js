const service = require('../services/workflowService');
exports.list = async (req, res) => res.json(await service.list(req.user.id, req.query));
exports.create = async (req, res) => res.status(201).json(await service.create(req.user.id, req.body));
exports.get = async (req, res) => res.json(await service.get(req.user.id, req.params.id));
exports.update = async (req, res) => res.json(await service.update(req.user.id, req.params.id, req.body));
exports.duplicate = async (req, res) => res.status(201).json(await service.duplicate(req.user.id, req.params.id));
exports.remove = async (req, res) => res.json(await service.remove(req.user.id, req.params.id));
exports.dashboard = async (req, res) => res.json(await service.dashboard(req.user.id));
