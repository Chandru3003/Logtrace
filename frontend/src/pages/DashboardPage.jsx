import { useState, useEffect, useRef } from 'react'
import axiosInstance from '../utils/axiosInstance'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Legend as PieLegend,
} from 'recharts'
import {
  FileText,
  AlertTriangle,
  Server,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

import { API_BASE } from '../config'

const LEVEL_COLORS = {
  INFO: '#3b82f6',
  WARN: '#eab308',
  ERROR: '#ef4444',
  DEBUG: '#6b7280',
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ec4899', '#64748b']

const STAT_CARDS = [
  {
    id: 'totalLogs',
    label: 'Total Logs Today',
    icon: FileText,
    color: '#3b82f6',
    key: 'totalLogsToday',
    trend: 2.4,
  },
  {
    id: 'errorRate',
    label: 'Error Rate %',
    icon: AlertTriangle,
    color: '#ef4444',
    key: 'errorRate',
    suffix: '%',
    trend: -0.1,
  },
  {
    id: 'activeServices',
    label: 'Active Services',
    icon: Server,
    color: '#22c55e',
    key: 'activeServices',
    trend: 0,
  },
  {
    id: 'avgResponse',
    label: 'Avg Response Time',
    icon: Clock,
    color: '#8b5cf6',
    key: 'avgResponseTime',
    suffix: 'ms',
    trend: -5.2,
  },
]

function StatCard({ card, value }) {
  const Icon = card.icon
  const trend = card.trend
  return (
    <div
      className="dashboard-stat-card"
      style={{ borderLeftColor: card.color, '--glow-color': card.color }}
    >
      <div className="stat-icon-wrap" style={{ color: card.color }}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="stat-content">
        <p className="stat-value">
          {value != null ? value.toLocaleString() : '—'}
          {card.suffix ?? ''}
        </p>
        <p className="stat-label">{card.label}</p>
        {trend != null && trend !== 0 && (
          <span className={`stat-trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const time = label ? new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-time">{time}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}:</span>
          <span className="chart-tooltip-value">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function LogRow({ log, isNew }) {
  const level = (log.level || 'info').toUpperCase()
  const color = LEVEL_COLORS[level] ?? LEVEL_COLORS.INFO
  const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'
  return (
    <tr className={`log-row ${isNew ? 'log-row-new' : ''}`} style={{ borderLeftColor: color }}>
      <td className="log-cell log-time">{time}</td>
      <td className="log-cell log-service">{log.service ?? '—'}</td>
      <td className="log-cell log-message">{log.message ?? '—'}</td>
    </tr>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [volumeData, setVolumeData] = useState([])
  const [serviceData, setServiceData] = useState([])
  const [servicesDetail, setServicesDetail] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const prevLogIds = useRef(new Set())

  const fetchStats = async () => {
    try {
      const { data } = await axiosInstance.get('/dashboard/stats')
      setStats(data)
    } catch (err) {
      setError(err?.message || 'Failed to fetch stats')
    }
  }

  const fetchVolume = async () => {
    try {
      const { data } = await axiosInstance.get('/dashboard/volume')
      setVolumeData(data.data ?? [])
    } catch (err) {
      if (!error) setError(err?.message || 'Failed to fetch volume')
    }
  }

  const fetchServices = async () => {
    try {
      const { data } = await axiosInstance.get('/dashboard/services')
      const items = (data.data ?? []).map((d, i) => ({
        ...d,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      }))
      setServiceData(items)
    } catch (err) {
      if (!error) setError(err?.message || 'Failed to fetch services')
    }
  }

  const fetchServicesDetail = async () => {
    try {
      const { data } = await axiosInstance.get('/services')
      setServicesDetail(data.services ?? [])
    } catch {
      setServicesDetail([])
    }
  }

  const fetchLogs = async () => {
    try {
      const { data } = await axiosInstance.get('/logs?size=10')
      const hits = data.hits ?? []
      const prev = prevLogIds.current
      const withNew = hits.map((log) => {
        const id = log.id ?? log.traceId
        return { ...log, _isNew: prev.size > 0 && !prev.has(id) }
      })
      prevLogIds.current = new Set(hits.map((l) => l.id ?? l.traceId))
      setLogs(withNew)
    } catch (err) {
      if (!error) setError(err?.message || 'Failed to fetch logs')
    }
  }

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    await Promise.all([fetchStats(), fetchVolume(), fetchServices(), fetchServicesDetail(), fetchLogs()])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats()
      fetchVolume()
      fetchServices()
      fetchServicesDetail()
      fetchLogs()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const elevatedServices = (servicesDetail ?? []).filter((s) => (s.errorRate ?? 0) > 10)
  const showAlert = elevatedServices.length > 0
  const alertMessage =
    elevatedServices.length === 0
      ? ''
      : elevatedServices.length === 1
        ? `Incident Detected — ${elevatedServices[0].name} ERROR rate elevated (${elevatedServices[0].errorRate?.toFixed(1)}%)`
        : `Incident Detected — ${elevatedServices.map((s) => s.name).join(', ')} ERROR rates elevated`

  if (loading && !stats) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner" />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <style>{`
        .dashboard {
          min-height: 100%;
          background: #0B0F1A;
          padding: 0;
        }

        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #94a3b8;
          padding: 4rem;
        }
        .dashboard-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(59, 130, 246, 0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dashboard-alert {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.5);
          border-radius: 0.5rem;
          padding: 0.75rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #f87171;
          font-weight: 600;
          animation: alertPulse 2s ease-in-out infinite;
        }
        .dashboard-alert-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
          animation: alertDotPulse 1.5s ease-in-out infinite;
        }
        @keyframes alertPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
          50% { box-shadow: 0 0 20px 4px rgba(239, 68, 68, 0.3); }
        }
        @keyframes alertDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .dashboard-error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          padding: 0.75rem 1.25rem;
          margin-bottom: 1.5rem;
          color: #f87171;
          font-size: 0.875rem;
        }

        .dashboard-stat-card {
          background: #1A2235;
          border-radius: 0.75rem;
          padding: 1.25rem;
          border-left: 4px solid;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }
        .stat-icon-wrap {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          background: rgba(255,255,255,0.05);
          flex-shrink: 0;
          filter: drop-shadow(0 0 12px var(--glow-color, #3b82f6));
        }
        .stat-content { flex: 1; min-width: 0; }
        .stat-value { font-size: 1.75rem; font-weight: 700; color: #fff; line-height: 1.2; }
        .stat-label { font-size: 0.8125rem; color: #94a3b8; margin-top: 0.25rem; }
        .stat-trend {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
        .stat-trend.trend-up { color: #22c55e; }
        .stat-trend.trend-down { color: #ef4444; }

        .dashboard-chart-card {
          background: #1A2235;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-top: 1.5rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        .dashboard-chart-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .dashboard-chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
        }
        .dashboard-chart-live-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.8);
          animation: liveDotPulse 2s ease-in-out infinite;
        }
        @keyframes liveDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }

        .dashboard-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        @media (max-width: 900px) {
          .dashboard-bottom { grid-template-columns: 1fr; }
        }

        .dashboard-logs-card, .dashboard-pie-card {
          background: #1A2235;
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
          overflow: hidden;
        }
        .dashboard-logs-title, .dashboard-pie-title {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 1rem;
        }

        .log-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace; }
        .log-row {
          border-bottom: 1px solid rgba(255,255,255,0.05);
          border-left: 3px solid transparent;
          transition: background 0.2s;
        }
        .log-row:hover { background: rgba(255,255,255,0.03); }
        .log-row-new { animation: logFlash 1.5s ease-out; }
        @keyframes logFlash {
          0% { background: rgba(59, 130, 246, 0.25); }
          100% { background: transparent; }
        }
        .log-cell { padding: 0.625rem 1rem; text-align: left; color: #94a3b8; }
        .log-time { width: 110px; color: #64748b; white-space: nowrap; }
        .log-service { width: 140px; color: #cbd5e1; }
        .log-message { color: #e2e8f0; }

        .chart-tooltip {
          background: #1A2235;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .chart-tooltip-time { color: #94a3b8; margin-bottom: 0.5rem; font-weight: 500; }
        .chart-tooltip-row { display: flex; align-items: center; gap: 0.5rem; color: #e2e8f0; }
        .chart-tooltip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .chart-tooltip-value { font-weight: 600; margin-left: auto; }

        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line { stroke: rgba(255,255,255,0.06); }
        .recharts-text { fill: #64748b; font-size: 11px; }
        .recharts-legend-item-text { color: #94a3b8 !important; }
        .recharts-area-curve { filter: drop-shadow(0 0 6px currentColor); }
      `}</style>

      {error && (
        <div className="dashboard-error-banner">
          {error} — Ensure backend is running at {API_BASE}
        </div>
      )}

      {showAlert && !error && (
        <div className="dashboard-alert">
          <span className="dashboard-alert-dot" />
          {alertMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.id} card={card} value={stats?.[card.key]} />
        ))}
      </div>

      <div className="dashboard-chart-card">
        <div className="dashboard-chart-header">
          <span className="dashboard-chart-live-dot" />
          <h2 className="dashboard-chart-title">Log Volume — Last 60 Minutes</h2>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaInfo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaWarn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaError" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaDebug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b7280" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<VolumeTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="INFO" stackId="1" stroke="#3b82f6" fill="url(#areaInfo)" strokeWidth={2} />
              <Area type="monotone" dataKey="WARN" stackId="1" stroke="#eab308" fill="url(#areaWarn)" strokeWidth={2} />
              <Area type="monotone" dataKey="ERROR" stackId="1" stroke="#ef4444" fill="url(#areaError)" strokeWidth={2} />
              <Area type="monotone" dataKey="DEBUG" stackId="1" stroke="#6b7280" fill="url(#areaDebug)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="dashboard-logs-card">
          <h2 className="dashboard-logs-title">Live Log Feed</h2>
          <div className="overflow-x-auto">
            <table className="log-table">
              <thead>
                <tr>
                  <th className="log-cell">Time</th>
                  <th className="log-cell">Service</th>
                  <th className="log-cell">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="log-cell text-center py-8" style={{ color: '#64748b' }}>
                      No logs yet
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <LogRow
                      key={log.id ?? log.traceId ?? Math.random()}
                      log={log}
                      isNew={log._isNew}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-pie-card">
          <h2 className="dashboard-pie-title">Log Distribution by Service</h2>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive
                  animationDuration={600}
                >
                  {serviceData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1A2235',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#e2e8f0',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value, name) => [value, name]}
                />
                <PieLegend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
