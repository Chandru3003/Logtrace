const cron = require('node-cron');
const elasticsearch = require('../elasticsearch');

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30', 10);
const CRON_SCHEDULE = process.env.RETENTION_CRON || '0 2 * * *'; // 2 AM daily

function runRetentionCleanup() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  elasticsearch.client
    .deleteByQuery({
      index: elasticsearch.INDEX_NAME,
      query: {
        range: {
          timestamp: { lt: cutoff.toISOString() },
        },
      },
    })
    .then((result) => {
      if (result.deleted > 0) {
        console.log(`[Retention] Deleted ${result.deleted} logs older than ${RETENTION_DAYS} days`);
      }
    })
    .catch((err) => {
      console.error('[Retention] Cleanup failed:', err.message);
    });
}

function startRetentionJob() {
  cron.schedule(CRON_SCHEDULE, runRetentionCleanup);
  console.log(`[Retention] Job scheduled: ${CRON_SCHEDULE} (${RETENTION_DAYS} days retention)`);
}

module.exports = {
  startRetentionJob,
  runRetentionCleanup,
};
