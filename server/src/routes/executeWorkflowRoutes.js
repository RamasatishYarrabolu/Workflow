const router = require('express').Router(); const { param, body } = require('express-validator');
const authenticate = require('../middleware/authenticate'); const validate = require('../middleware/validateRequest'); const controller = require('../controllers/executionController');
const asyncHandler = require('../utils/asyncHandler');
router.post('/:id/execute', authenticate, [param('id').isMongoId(), body('input').optional().isObject()], validate, asyncHandler(controller.start));
module.exports = router;
