const express = require('express');
const elasticsearch = require('../elasticsearch');

const router = express.Router();

const SERVICE_NAMES = [
  'auth-service',
  'payment-service',
  'api-gateway',
  'user-service',
  'notification-service',
];

function getThirtyMinutesAgo() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 30);
  return d.toISOString();
}

function getSixtyMinutesAgo() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 60);
  return d.toISOString();
}

router.get('/', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const thirtyMinAgo = getThirtyMinutesAgo();
    const sixtyMinAgo = getSixtyMinutesAgo();

    const result = await elasticsearch.client.search({
      index: elasticsearch.INDEX_NAME,
      size: 0,
      query: { range: { timestamp: { gte: sixtyMinAgo, lte: now } } },
      aggs: {
        by_service: {
          terms: { field: 'service', size: 20, order: { _key: 'asc' } },
          aggs: {
            error_count: {
              filter: { term: { level: 'error' } },
            },
            avg_duration: {
              avg: { field: 'duration' },
            },
            last_seen: {
              max: { field: 'timestamp' },
            },
            volume_over_time: {
              date_histogram: {
                field: 'timestamp',
                fixed_interval: '5m',
                min_doc_count: 0,
                extended_bounds: { min: thirtyMinAgo, max: now },
              },
            },
          },
        },
      },
    });

    const buckets = result.aggregations?.by_service?.buckets ?? [];
    const services = SERVICE_NAMES.map((name) => {
      const b = buckets.find((x) => x.key === name);
      if (!b) {
        return {
          name,
          totalLogs: 0,
          errorCount: 0,
          errorRate: 0,
          avgDuration: 0,
          lastSeen: null,
          volumeOverTime: [],
        };
      }
      const totalLogs = b.doc_count;
      const errorCount = b.error_count?.doc_count ?? 0;
      const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;
      const volumeOverTime = (b.volume_over_time?.buckets ?? []).map((v) => ({
        time: v.key_as_string,
        count: v.doc_count,
      }));
      return {
        name,
        totalLogs,
        errorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        avgDuration: Math.round(b.avg_duration?.value ?? 0),
        lastSeen: b.last_seen?.value ?? null,
        volumeOverTime,
      };
    });

    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
