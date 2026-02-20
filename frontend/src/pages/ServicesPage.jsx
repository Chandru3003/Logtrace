import { useState, useEffect, useCallback, Fragment } from 'react'
import axiosInstance from '../utils/axiosInstance'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import {
  Key,
  CreditCard,
  Globe,
  User,
  Bell,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

import { API_BASE } from '../config'

const SERVICE_CONFIG = {
  'auth-service': { icon: Key, color: '#3b82f6' },
  'payment-service': { icon: CreditCard, color: '#8b5cf6' },
  'api-gateway': { icon: Globe, color: '#06b6d4' },
  'user-service': { icon: User, color: '#22c55e' },
  'notification-service': { icon: Bell, color: '#eab308' },
}

const LEVEL_COLORS = { error: '#ef4444', warn: '#eab308', info: '#3b82f6', debug: '#6b7280' }

function getStatus(errorRate, serviceName) {
  if (serviceName === 'payment-service' && errorRate > 10) return 'DEGRADED'
  if (errorRate >= 20) return 'DOWN'
  if (errorRate >= 5) return 'DEGRADED'
  return 'HEALTHY'
}

function StatusBadge({ status }) {
  const styles = {
    HEALTHY: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', border: 'rgba(34,197,94,0.4)' },
    DEGRADED: { bg: 'rgba(234,179,8,0.2)', color: '#eab308', border: 'rgba(234,179,8,0.4)' },
    DOWN: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'rgba(239,68,68,0.4)' },
  }
  const s = styles[status] ?? styles.HEALTHY
  return (
    <span
      className="status-badge"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  )
}

function ServiceCard({ service, isDegradedPulse }) {
  const config = SERVICE_CONFIG[service.name] ?? { icon: Globe, color: '#64748b' }
  const Icon = config.icon
  const status = getStatus(service.errorRate, service.name)

  return (
    <div
      className={`service-card ${isDegradedPulse ? 'service-card-degraded' : ''}`}
    >
      <div className="service-card-header">
        <div className="service-card-icon" style={{ color: config.color }}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="service-card-title">{service.name}</div>
        <StatusBadge status={status} />
      </div>
      <div className="service-card-stats">
        <div className="service-card-stat">
          <span className="service-card-stat-val">{(service.totalLogs ?? service.totalLogsToday ?? 0).toLocaleString()}</span>
          <span className="service-card-stat-lbl">logs</span>
        </div>
        <div className="service-card-stat">
          <span
            className="service-card-stat-val service-card-stat-error"
          >
            {service.errorCount}
          </span>
          <span className="service-card-stat-lbl">errors</span>
        </div>
        <div className="service-card-stat">
          <span className="service-card-stat-val">{service.avgDuration}ms</span>
          <span className="service-card-stat-lbl">avg</span>
        </div>
      </div>
      <div className="service-card-sparkline">
        <ResponsiveContainer width="100%" height={40}>
          <LineChart data={service.volumeOverTime ?? service.volume ?? []} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Line
              type="monotone"
              dataKey="count"
              stroke={config.color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [expandedService, setExpandedService] = useState(null)
  const [serviceLogs, setServiceLogs] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/services')
      setServices(data.services ?? [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err?.message || 'Failed to fetch')
      setServices([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchServiceLogs = useCallback(async (serviceName) => {
    try {
      const { data } = await axiosInstance.get(
        `/logs?service=${encodeURIComponent(serviceName)}&size=5`
      )
      setServiceLogs((prev) => ({ ...prev, [serviceName]: data.hits ?? [] }))
    } catch {
      setServiceLogs((prev) => ({ ...prev, [serviceName]: [] }))
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const handleRowClick = (name) => {
    const next = expandedService === name ? null : name
    setExpandedService(next)
    if (next && !serviceLogs[next]) fetchServiceLogs(next)
  }

  const paymentService = services.find((s) => s.name === 'payment-service')
  const isPaymentDegraded = paymentService?.errorRate > 10

  if (loading && services.length === 0) {
    return (
      <div className="services-loading">
        <div className="services-spinner" />
        <p>Loading services...</p>
      </div>
    )
  }

  return (
    <div className="services-page">
      <style>{`
        .services-page { background: #0B0F1A; min-height: 100%; }
        .services-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #94a3b8;
          padding: 4rem;
        }
        .services-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(59,130,246,0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .services-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .services-title { font-size: 1.5rem; font-weight: 700; color: #fff; margin: 0; }
        .services-updated {
          font-size: 0.8125rem;
          color: #64748b;
        }
        .service-card {
          background: #1A2235;
          border-radius: 0.75rem;
          padding: 1.25rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .service-card-degraded {
          border-color: rgba(234, 179, 8, 0.5);
          animation: degradedPulse 2s ease-in-out infinite;
        }
        @keyframes degradedPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.2); }
          50% { box-shadow: 0 0 20px 4px rgba(234, 179, 8, 0.3); }
        }
        .service-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .service-card-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          background: rgba(255,255,255,0.05);
        }
        .service-card-title {
          flex: 1;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #e2e8f0;
        }
        .status-badge {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
        }
        .service-card-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .service-card-stat { display: flex; flex-direction: column; }
        .service-card-stat-val { font-size: 1.125rem; font-weight: 700; color: #fff; }
        .service-card-stat-error { color: #ef4444; }
        .service-card-stat-lbl { font-size: 0.6875rem; color: #64748b; }
        .service-card-sparkline { height: 40px; }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .services-table-wrap {
          background: #1A2235;
          border-radius: 0.75rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
          overflow: hidden;
        }
        .services-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }
        .services-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.2);
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .services-table td {
          padding: 0.75rem 1rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          color: #94a3b8;
          vertical-align: middle;
        }
        .services-table tr.service-row { cursor: pointer; transition: background 0.15s; }
        .services-table tr.service-row:hover { background: rgba(255,255,255,0.04); }
        .service-name-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .service-expand-icon { color: #64748b; transition: transform 0.2s; }
        .service-expand-icon.expanded { transform: rotate(0deg); }
        .service-log-detail {
          background: rgba(0,0,0,0.3);
          padding: 1rem;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.75rem;
        }
        .service-log-row {
          padding: 0.375rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        .service-log-row:last-child { border-bottom: none; }
        .service-log-time { color: #64748b; min-width: 85px; }
        .service-log-level {
          min-width: 50px;
          font-weight: 600;
          font-size: 0.6875rem;
        }
        .service-log-msg { color: #e2e8f0; word-break: break-word; }
      `}</style>

      <div className="services-header">
        <h1 className="services-title">Services</h1>
        <span className="services-updated">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error} — Ensure backend is running at {API_BASE}
        </div>
      )}

      <div className="services-grid">
        {(services.length > 0 ? services : [
          { name: 'auth-service', totalLogs: 0, errorCount: 0, errorRate: 0, avgDuration: 0, lastSeen: null, volumeOverTime: [] },
          { name: 'payment-service', totalLogs: 0, errorCount: 0, errorRate: 0, avgDuration: 0, lastSeen: null, volumeOverTime: [] },
          { name: 'api-gateway', totalLogs: 0, errorCount: 0, errorRate: 0, avgDuration: 0, lastSeen: null, volumeOverTime: [] },
          { name: 'user-service', totalLogs: 0, errorCount: 0, errorRate: 0, avgDuration: 0, lastSeen: null, volumeOverTime: [] },
          { name: 'notification-service', totalLogs: 0, errorCount: 0, errorRate: 0, avgDuration: 0, lastSeen: null, volumeOverTime: [] },
        ]).map((svc) => (
          <ServiceCard
            key={svc.name}
            service={svc}
            isDegradedPulse={
              svc.name === 'payment-service' && svc.errorRate > 10
            }
          />
        ))}
      </div>

      <div className="services-table-wrap">
        <table className="services-table">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Service Name</th>
              <th>Status</th>
              <th>Total Logs</th>
              <th>Error Rate</th>
              <th>Avg Duration</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => {
              const isExpanded = expandedService === svc.name
              const logs = serviceLogs[svc.name] ?? []
              const config = SERVICE_CONFIG[svc.name] ?? { icon: Globe, color: '#64748b' }
              const Icon = config.icon
              const status = getStatus(svc.errorRate, svc.name)
              return (
                <Fragment key={svc.name}>
                  <tr
                    key={svc.name}
                    className="service-row"
                    onClick={() => handleRowClick(svc.name)}
                  >
                    <td>
                      <span className={`service-expand-icon ${isExpanded ? 'expanded' : ''}`}>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="service-name-cell">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: config.color,
                          }}
                        />
                        {svc.name}
                      </div>
                    </td>
                    <td><StatusBadge status={status} /></td>
                    <td>{(svc.totalLogs ?? svc.totalLogsToday ?? 0).toLocaleString()}</td>
                    <td>{svc.errorRate}%</td>
                    <td>{svc.avgDuration} ms</td>
                    <td>
                      {svc.lastSeen
                        ? new Date(svc.lastSeen).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${svc.name}-expand`}>
                      <td colSpan={7} style={{ padding: 0, borderTop: 'none' }}>
                        <div className="service-log-detail">
                          <div style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                            Last 5 logs
                          </div>
                          {logs.length === 0 ? (
                            <div style={{ color: '#64748b' }}>No logs</div>
                          ) : (
                            logs.map((log, i) => {
                              const lvl = (log.level || 'info').toLowerCase()
                              const lc = LEVEL_COLORS[lvl] ?? LEVEL_COLORS.info
                              return (
                                <div key={i} className="service-log-row">
                                  <span className="service-log-time">
                                    {log.timestamp
                                      ? new Date(log.timestamp).toLocaleTimeString()
                                      : '—'}
                                  </span>
                                  <span
                                    className="service-log-level"
                                    style={{ color: lc }}
                                  >
                                    {(log.level || 'info').toUpperCase()}
                                  </span>
                                  <span className="service-log-msg">{log.message ?? '—'}</span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
