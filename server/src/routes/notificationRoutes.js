const router = require('express').Router(); const { param } = require('express-validator');
const authenticate = require('../middleware/authenticate'); const validate = require('../middleware/validateRequest'); const controller = require('../controllers/notificationController');
const asyncHandler = require('../utils/asyncHandler');
router.use(authenticate); router.get('/', asyncHandler(controller.list)); router.patch('/:id/read', [param('id').isMongoId()], validate, asyncHandler(controller.markRead)); module.exports = router;
