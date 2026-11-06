const express = require('express');
const router = express.Router();

const dashboardRoutes = require('./dashboardRoutes');
const statsRoutes = require('./statsRoutes');
const dataRoutes = require('./dataRoutes');
const userRoutes = require('./userRoutes');
const activationRoutes = require('./activationRoutes');
const userActivationRoutes = require('./userActivationRoutes');
const systemRoutes = require('./systemRoutes');
const notificationRoutes = require('./notificationRoutes');

router.use('/', dashboardRoutes);
router.use('/', statsRoutes);
router.use('/', dataRoutes);
router.use('/', userRoutes);
router.use('/', activationRoutes);
router.use('/', userActivationRoutes);
router.use('/', systemRoutes);
router.use('/', notificationRoutes);

module.exports = router;

