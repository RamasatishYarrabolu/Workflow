const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const validate = require('../middleware/validateRequest');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../utils/asyncHandler');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many authentication attempts. Try again later.' } });
router.post('/register', authLimiter, [body('name').trim().isLength({ min: 1, max: 100 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 128 })], validate, asyncHandler(controller.register));
router.post('/login', authLimiter, [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 128 })], validate, asyncHandler(controller.login));
router.get('/me', authenticate, asyncHandler(controller.me));
module.exports = router;
