const express = require('express');
const router = express.Router();

const dashboardRoutes = require('./dashboardRoutes');
const statsRoutes = require('./statsRoutes');
const dataRoutes = require('./dataRoutes');
const userRoutes = require('./userRoutes');
const activationRoutes = require('./activationRoutes');
const userActivationRoutes = require('./userActivationRoutes');

router.use('/', dashboardRoutes);
router.use('/', statsRoutes);
router.use('/', dataRoutes);
router.use('/', userRoutes);
router.use('/', activationRoutes);
router.use('/', userActivationRoutes);

module.exports = router;

