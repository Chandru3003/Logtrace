const { v4: uuidv4 } = require('uuid');
const elasticsearch = require('./elasticsearch');

const SERVICES = [
  'auth-service',
  'payment-service',
  'api-gateway',
  'user-service',
  'notification-service',
];

const LOG_TEMPLATES = {
  'auth-service': [
    { level: 'info', message: 'User login attempt for user_id={userId}' },
    { level: 'info', message: 'JWT token refreshed successfully' },
    { level: 'info', message: 'Session created for user_id={userId}' },
    { level: 'debug', message: 'OAuth callback received from provider' },
    { level: 'warn', message: 'Failed login attempt - invalid credentials' },
    { level: 'info', message: 'Password reset token generated' },
    { level: 'info', message: 'MFA verification passed' },
    { level: 'debug', message: 'Token validation cache hit' },
  ],
  'payment-service': [
    { level: 'info', message: 'Processing payment for order_id={orderId}' },
    { level: 'info', message: 'Stripe webhook received: payment_intent.succeeded' },
    { level: 'info', message: 'Refund initiated for transaction {txId}' },
    { level: 'debug', message: 'Payment method validated' },
    { level: 'info', message: 'Subscription renewal processed' },
    { level: 'warn', message: 'Retry attempt for failed payment' },
    { level: 'info', message: 'Balance check completed' },
    { level: 'info', message: 'Invoice generated for customer' },
  ],
  'api-gateway': [
    { level: 'info', message: 'Request routed to {service} - status 200' },
    { level: 'info', message: 'Rate limit check passed for client' },
    { level: 'debug', message: 'Request authenticated via API key' },
    { level: 'warn', message: 'Rate limit exceeded for IP {ip}' },
    { level: 'info', message: 'Circuit breaker closed for downstream service' },
    { level: 'info', message: 'Request timeout after 30s - returning 504' },
    { level: 'debug', message: 'Request ID propagated to downstream' },
    { level: 'info', message: 'Health check passed for /api/users' },
  ],
  'user-service': [
    { level: 'info', message: 'User profile updated for user_id={userId}' },
    { level: 'debug', message: 'Cache hit for user profile' },
    { level: 'info', message: 'New user registered' },
    { level: 'info', message: 'Avatar upload completed' },
    { level: 'warn', message: 'Cache miss - fetching from database' },
    { level: 'info', message: 'Preferences synced across devices' },
    { level: 'debug', message: 'Elasticsearch query executed in {ms}ms' },
    { level: 'info', message: 'Bulk user import started' },
  ],
  'notification-service': [
    { level: 'info', message: 'Email queued for delivery' },
    { level: 'info', message: 'Push notification sent to device' },
    { level: 'debug', message: 'SMS delivery confirmed' },
    { level: 'warn', message: 'Email bounce received - marking invalid' },
    { level: 'info', message: 'Webhook delivered to subscriber' },
    { level: 'info', message: 'In-app notification created' },
    { level: 'debug', message: 'Template rendered successfully' },
    { level: 'info', message: 'Batch notification job completed' },
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(msg) {
  return msg
    .replace('{userId}', Math.floor(Math.random() * 10000))
    .replace('{orderId}', `ORD-${Date.now().toString(36).toUpperCase()}`)
    .replace('{txId}', `txn_${Math.random().toString(36).slice(2, 12)}`)
    .replace('{service}', pickRandom(['user-service', 'payment-service']))
    .replace('{ip}', `192.168.1.${Math.floor(Math.random() * 255)}`)
    .replace('{ms}', Math.floor(Math.random() * 150));
}

function createLog(service, isIncident = false) {
  const traceId = uuidv4();
  const timestamp = new Date().toISOString();
  const duration = Math.floor(Math.random() * 500);

  if (isIncident) {
    return {
      timestamp,
      level: 'error',
      service,
      message: 'DB connection timeout - max pool size reached',
      traceId,
      duration,
      archived: false,
    };
  }

  const template = pickRandom(LOG_TEMPLATES[service]);
  return {
    timestamp,
    level: template.level,
    service,
    message: interpolate(template.message),
    traceId,
    duration,
    archived: false,
  };
}

async function sendLogs(service, count = 5, isIncident = false) {
  const bulk = [];
  for (let i = 0; i < count; i++) {
    bulk.push({ index: { _index: elasticsearch.INDEX_NAME } });
    bulk.push(createLog(service, isIncident));
  }

  try {
    const result = await elasticsearch.client.bulk({
      refresh: false,
      operations: bulk,
    });
    if (result.errors) {
      console.error(`[Simulator] Bulk index errors for ${service}:`, result.items?.filter((i) => i.index?.error));
    }
  } catch (err) {
    console.error(`[Simulator] Failed to index logs for ${service}:`, err.message);
  }
}

async function tick(isPaymentIncident = false) {
  const promises = SERVICES.map((service) => {
    if (service === 'payment-service' && isPaymentIncident) {
      return sendLogs(service, 25, true);
    }
    return sendLogs(service, 5, false);
  });
  await Promise.all(promises);
}

function getNextIncidentDelay() {
  const min = 2 * 60 * 1000;
  const max = 3 * 60 * 1000;
  return min + Math.random() * (max - min);
}

let tickInterval = null;
let incidentTimeout = null;
let nextIncidentSchedule = null;
let isIncidentActive = false;
let isRunning = false;

function scheduleNextIncident() {
  const delay = getNextIncidentDelay();
  nextIncidentSchedule = setTimeout(() => {
    isIncidentActive = true;
    console.log('[Simulator] Payment service incident started - ERROR flood for 30s');
    incidentTimeout = setTimeout(() => {
      isIncidentActive = false;
      console.log('[Simulator] Payment service incident ended');
      scheduleNextIncident();
    }, 30 * 1000);
  }, delay);
}

function startSimulator() {
  if (isRunning) return;
  isRunning = true;
  tickInterval = setInterval(() => {
    tick(isIncidentActive).catch(console.error);
  }, 1000);
  scheduleNextIncident();
  console.log('[Simulator] Started - 5 services × 5 logs/sec = 25 logs/sec (payment incident every 2-3 min)');
}

function stopSimulator() {
  if (!isRunning) return;
  isRunning = false;
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  if (incidentTimeout) {
    clearTimeout(incidentTimeout);
    incidentTimeout = null;
  }
  if (nextIncidentSchedule) {
    clearTimeout(nextIncidentSchedule);
    nextIncidentSchedule = null;
  }
  isIncidentActive = false;
  console.log('[Simulator] Stopped');
}

function getSimulatorStatus() {
  return { enabled: isRunning };
}

module.exports = { startSimulator, stopSimulator, getSimulatorStatus };
