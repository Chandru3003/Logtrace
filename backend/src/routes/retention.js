const express = require('express');
const elasticsearch = require('../elasticsearch');

const router = express.Router();

const SERVICES = [
  'auth-service',
  'payment-service',
  'api-gateway',
  'user-service',
  'notification-service',
];

// In-memory retention policies: { service: { retentionDays, lastCleanupRun, logsDeletedLastRun } }
let policies = {};
SERVICES.forEach((s) => {
  policies[s] = {
    retentionDays: 30,
    lastCleanupRun: null,
    logsDeletedLastRun: 0,
  };
});

router.get('/stats', async (req, res) => {
  try {
    const result = await elasticsearch.client.indices.stats({
      index: elasticsearch.INDEX_NAME,
    });

    const indexStats = result.indices?.[elasticsearch.INDEX_NAME];
    res.json({
      index: elasticsearch.INDEX_NAME,
      docs: indexStats?.primaries?.docs?.count ?? 0,
      size: indexStats?.primaries?.store?.size_in_bytes ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  res.json({ policies });
});

router.post('/cleanup', async (req, res) => {
  try {
    const result = await elasticsearch.client.indices.stats({
      index: elasticsearch.INDEX_NAME,
    });
    const indexStats = result.indices?.[elasticsearch.INDEX_NAME];
    const beforeDocs = indexStats?.primaries?.docs?.count ?? 0;
    const beforeSize = indexStats?.primaries?.store?.size_in_bytes ?? 0;

    let totalDeleted = 0;
    const now = new Date();

    for (const service of SERVICES) {
      const { retentionDays } = policies[service] || { retentionDays: 30 };
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const delResult = await elasticsearch.client.deleteByQuery({
        index: elasticsearch.INDEX_NAME,
        query: {
          bool: {
            must: [
              { term: { service } },
              { range: { timestamp: { lt: cutoff.toISOString() } } },
            ],
          },
        },
      });

      totalDeleted += delResult.deleted;
      policies[service] = {
        ...policies[service],
        lastCleanupRun: now.toISOString(),
        logsDeletedLastRun: delResult.deleted,
      };
    }

    const resultAfter = await elasticsearch.client.indices.stats({
      index: elasticsearch.INDEX_NAME,
    });
    const indexStatsAfter = resultAfter.indices?.[elasticsearch.INDEX_NAME];
    const afterDocs = indexStatsAfter?.primaries?.docs?.count ?? 0;
    const afterSize = indexStatsAfter?.primaries?.store?.size_in_bytes ?? 0;

    const savedBytes = beforeSize - afterSize;
    res.json({
      deleted: totalDeleted,
      savedBytes: Math.max(0, savedBytes),
      before: { docs: beforeDocs, size: beforeSize },
      after: { docs: afterDocs, size: afterSize },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { policies: incoming } = req.body || {};
    if (incoming && Array.isArray(incoming)) {
      incoming.forEach(({ service, retentionDays }) => {
        if (SERVICES.includes(service) && retentionDays != null) {
          const days = parseInt(retentionDays, 10);
          if (days >= 7 && days <= 90) {
            policies[service] = {
              ...policies[service],
              retentionDays: days,
            };
          }
        }
      });
    }
    res.json({ policies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
