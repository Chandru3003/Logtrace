require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const elasticsearch = require('./elasticsearch');
const authMiddleware = require('./middleware/auth');
const authRouter = require('./routes/auth');
const logsRouter = require('./routes/logs');
const retentionRouter = require('./routes/retention');
const dashboardRouter = require('./routes/dashboard');
const servicesRouter = require('./routes/services');
const { startRetentionJob } = require('./jobs/retentionJob');
const simulatorRouter = require('./routes/simulator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/logs', authMiddleware, logsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/services', authMiddleware, servicesRouter);
app.use('/api/retention', authMiddleware, retentionRouter);
app.use('/api/simulator', authMiddleware, simulatorRouter);

app.get('/health', async (req, res) => {
  try {
    const health = await elasticsearch.ping();
    res.json({ status: 'ok', elasticsearch: health });
  } catch (err) {
    res.status(503).json({ status: 'error', elasticsearch: false });
  }
});

app.get('/', (req, res) => {
  res.json({ name: 'LogTrace API', version: '1.0.0', status: 'running' });
});

app.listen(PORT, async () => {
  console.log(`LogTrace backend running on port ${PORT}`);
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logtrace';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
  }
  try {
    await elasticsearch.init();
    startRetentionJob();
    console.log('[Simulator] Off by default — turn on via Settings to generate demo logs');
  } catch (err) {
    console.error('Failed to initialize Elasticsearch:', err.message);
  }
});
