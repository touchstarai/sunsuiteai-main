const express = require('express');

const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/resetpassword/:token', viewController.resetPassword);

router.use(authController.isLogedin);

router.route('/').get(viewController.home);

router.route('/about').get(viewController.about);
router.route('/pricing').get(viewController.pricing);
router.route('/register').get(viewController.register);
router.route('/login').get(viewController.login);

router.route('/terms').get(viewController.terms);

// router.route('/error').get(viewController.error);

router.route('/profile').get(authController.protect, viewController.profile);

router.route('/chat').get(viewController.chatpdf);

router.use(authController.protect);
router.route('/dashboard').get(viewController.dashboard);

router.use(authController.strictTo('dev', 'admin'));
router.route('/admin/').get(adminController.adminDashboard);
router.route('/admin/users').get(adminController.users);
router.route('/admin/plans').get(adminController.managePlans);

module.exports = router;
