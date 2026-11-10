const router = require('express').Router();
const mongoose = require('mongoose');
router.get('/', (_req, res) => res.json({ status: 'ok', uptime: process.uptime(), database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', timestamp: new Date().toISOString() }));
module.exports = router;
