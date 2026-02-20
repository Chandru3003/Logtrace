const express = require('express');
const { v4: uuidv4 } = require('uuid');
const elasticsearch = require('../elasticsearch');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { level, message, service, traceId, duration, archived, timestamp } = req.body;
    const doc = {
      timestamp: timestamp || new Date().toISOString(),
      level: level || 'info',
      service: service || 'unknown',
      message: message || '',
      traceId: traceId || uuidv4(),
      duration: duration ?? 0,
      archived: archived ?? false,
    };

    await elasticsearch.client.index({
      index: elasticsearch.INDEX_NAME,
      document: doc,
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getTimeRangeBounds(timeRange) {
  const now = new Date();
  const to = now.toISOString();
  let from;
  switch (timeRange) {
    case '15m':
      from = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      break;
    case '1h':
      from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      break;
    case '6h':
      from = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      break;
    case '24h':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      break;
    default:
      return null;
  }
  return { from, to };
}

router.get('/', async (req, res) => {
  try {
    const { from = 0, size = 50, level, service, q, timeRange } = req.query;
    const query = { bool: { must: [] } };

    if (level) query.bool.must.push({ term: { level: level.toLowerCase() } });
    if (service) query.bool.must.push({ term: { service } });
    if (q && q.trim()) {
      query.bool.must.push({
        match: {
          message: {
            query: q.trim(),
            operator: 'and',
            fuzziness: 'AUTO',
          },
        },
      });
    }
    const bounds = getTimeRangeBounds(timeRange);
    if (bounds) {
      query.bool.must.push({
        range: { timestamp: { gte: bounds.from, lte: bounds.to } },
      });
    }

    const result = await elasticsearch.client.search({
      index: elasticsearch.INDEX_NAME,
      from: parseInt(from, 10),
      size: parseInt(size, 10),
      query: query.bool.must.length ? query : { match_all: {} },
      sort: [{ timestamp: 'desc' }],
    });

    const total = result.hits.total?.value ?? result.hits.total ?? 0;
    res.json({
      total,
      hits: result.hits.hits.map((h) => ({ id: h._id, ...h._source })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
