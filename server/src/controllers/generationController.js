const generation = require('../services/workflowGenerationService');
exports.generate = async (req, res) => { const result = await generation.generate(req.body.prompt); res.json({ ...result, catalog: generation.catalog }); };
exports.catalog = (_req, res) => res.json(generation.catalog);
