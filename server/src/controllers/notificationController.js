const Notification = require('../models/Notification');
exports.list = async (req, res) => { const items = await Notification.find({ owner: req.user.id }).sort({ createdAt: -1 }).limit(100); res.json({ items, unread: items.filter((item) => !item.readAt).length }); };
exports.markRead = async (req, res) => { const item = await Notification.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, { readAt: new Date() }, { new: true }); if (!item) return res.status(404).json({ message: 'Notification not found.' }); res.json(item); };
