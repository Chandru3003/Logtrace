const express = require('express');
const { startSimulator, stopSimulator, getSimulatorStatus } = require('../simulator');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json(getSimulatorStatus());
});

router.post('/enable', (req, res) => {
  startSimulator();
  res.json({ enabled: true });
});

router.post('/disable', (req, res) => {
  stopSimulator();
  res.json({ enabled: false });
});

module.exports = router;
