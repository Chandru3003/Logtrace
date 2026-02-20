const express = require('express');
const elasticsearch = require('../elasticsearch');

const router = express.Router();

function getTodayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getSixtyMinutesAgo() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 60);
  return d.toISOString();
}

router.get('/stats', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const todayStart = getTodayStart();
    const sixtyMinAgo = getSixtyMinutesAgo();

    const [todayResult, errorsResult, servicesResult, durationResult] = await Promise.all([
      elasticsearch.client.count({
        index: elasticsearch.INDEX_NAME,
        query: { range: { timestamp: { gte: todayStart, lte: now } } },
      }),
      elasticsearch.client.search({
        index: elasticsearch.INDEX_NAME,
        size: 0,
        query: { range: { timestamp: { gte: sixtyMinAgo, lte: now } } },
        aggs: {
          by_level: { terms: { field: 'level', size: 10 } },
          total: { value_count: { field: 'level' } },
        },
      }),
      elasticsearch.client.search({
        index: elasticsearch.INDEX_NAME,
        size: 0,
        query: { range: { timestamp: { gte: sixtyMinAgo, lte: now } } },
        aggs: { services: { cardinality: { field: 'service' } } },
      }),
      elasticsearch.client.search({
        index: elasticsearch.INDEX_NAME,
        size: 0,
        query: {
          bool: {
            must: [
              { range: { timestamp: { gte: sixtyMinAgo, lte: now } } },
              { range: { duration: { gte: 0 } } },
            ],
          },
        },
        aggs: { avg_duration: { avg: { field: 'duration' } } },
      }),
    ]);

    const totalLast60 = errorsResult.aggregations?.total?.value ?? 0;
    const errorBuckets = errorsResult.aggregations?.by_level?.buckets ?? [];
    const errorCount = errorBuckets.find((b) => b.key.toLowerCase() === 'error')?.doc_count ?? 0;
    const errorRate = totalLast60 > 0 ? ((errorCount / totalLast60) * 100).toFixed(2) : 0;
    const activeServices = servicesResult.aggregations?.services?.value ?? 0;
    const avgDuration = Math.round(
      durationResult.aggregations?.avg_duration?.value ?? 0
    );

    res.json({
      totalLogsToday: todayResult.count ?? 0,
      errorRate: parseFloat(errorRate),
      activeServices,
      avgResponseTime: avgDuration,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/volume', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const sixtyMinAgo = getSixtyMinutesAgo();

    const result = await elasticsearch.client.search({
      index: elasticsearch.INDEX_NAME,
      size: 0,
      query: { range: { timestamp: { gte: sixtyMinAgo, lte: now } } },
      aggs: {
        over_time: {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: '5m',
            min_doc_count: 0,
            extended_bounds: {
              min: sixtyMinAgo,
              max: now,
            },
          },
          aggs: {
            by_level: {
              terms: { field: 'level', size: 10 },
            },
          },
        },
      },
    });

    const buckets = result.aggregations?.over_time?.buckets ?? [];
    const data = buckets.map((b) => {
      const levelBuckets = b.by_level?.buckets ?? [];
      const info = levelBuckets.find((l) => l.key.toLowerCase() === 'info')?.doc_count ?? 0;
      const warn = levelBuckets.find((l) => l.key.toLowerCase() === 'warn')?.doc_count ?? 0;
      const error = levelBuckets.find((l) => l.key.toLowerCase() === 'error')?.doc_count ?? 0;
      const debug = levelBuckets.find((l) => l.key.toLowerCase() === 'debug')?.doc_count ?? 0;
      return {
        time: b.key_as_string,
        INFO: info,
        WARN: warn,
        ERROR: error,
        DEBUG: debug,
        total: info + warn + error + debug,
      };
    });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/services', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const sixtyMinAgo = getSixtyMinutesAgo();

    const result = await elasticsearch.client.search({
      index: elasticsearch.INDEX_NAME,
      size: 0,
      query: { range: { timestamp: { gte: sixtyMinAgo, lte: now } } },
      aggs: {
        by_service: {
          terms: { field: 'service', size: 20 },
        },
      },
    });

    const KNOWN_SERVICES = [
      'auth-service',
      'payment-service',
      'api-gateway',
      'user-service',
      'notification-service',
    ];
    const buckets = result.aggregations?.by_service?.buckets ?? [];
    const data = buckets
      .filter((b) => KNOWN_SERVICES.includes(b.key))
      .map((b) => ({
        name: b.key,
        value: b.doc_count,
      }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
