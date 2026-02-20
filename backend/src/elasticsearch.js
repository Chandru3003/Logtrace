const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

const INDEX_NAME = 'logs';

async function init() {
  const ping = await client.ping();
  if (!ping) {
    throw new Error('Elasticsearch is not available');
  }

  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (!exists) {
    await client.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'keyword' },
          service: { type: 'keyword' },
          message: { type: 'text' },
          traceId: { type: 'keyword' },
          duration: { type: 'integer' },
          archived: { type: 'boolean' },
        },
      },
    });
  }

  return true;
}

async function ping() {
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  client,
  init,
  ping,
  INDEX_NAME,
};
