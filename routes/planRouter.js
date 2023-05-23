const express = require('express');

const authController = require('../controllers/authController');
const planController = require('../controllers/planController');

const router = express.Router();

router.route('/').get(planController.getPlans);
router.route('/:id').patch(planController.updatePlan);
router.get(
  '/checkout-session/:planId',
  authController.protect,
  planController.getCheckoutSession
);

module.exports = router;
