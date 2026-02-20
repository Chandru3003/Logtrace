import { useState, useEffect, useCallback, useRef } from 'react'
import axiosInstance from '../utils/axiosInstance'
import { Search, Copy, ChevronLeft, ChevronRight } from 'lucide-react'

import { API_BASE } from '../config'

const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'info', label: 'INFO' },
  { value: 'warn', label: 'WARN' },
  { value: 'error', label: 'ERROR' },
  { value: 'debug', label: 'DEBUG' },
]

const TIME_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '15m', label: 'Last 15 min' },
  { value: '1h', label: 'Last 1 hr' },
  { value: '6h', label: 'Last 6 hr' },
  { value: '24h', label: 'Last 24 hr' },
]

const LEVEL_COLORS = {
  info: '#3b82f6',
  warn: '#eab308',
  error: '#ef4444',
  debug: '#6b7280',
}

const SERVICE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#eab308',
]

function truncateTraceId(id) {
  if (!id) return '—'
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function LogDetailDrawer({ log, onClose, onCopy }) {
  if (!log) return null
  const level = (log.level || 'info').toLowerCase()
  const isError = level === 'error'

  const handleCopyJson = () => {
    const json = JSON.stringify(log, null, 2)
    navigator.clipboard.writeText(json)
    onCopy?.()
  }

  return (
    <div className="log-drawer-overlay" onClick={onClose}>
      <div
        className="log-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="log-drawer-header">
          <h3 className="log-drawer-title">Log Details</h3>
          <button className="log-drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="log-drawer-body">
          <div className="log-drawer-field">
            <span className="log-drawer-label">Timestamp</span>
            <span className="log-drawer-value">
              {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
            </span>
          </div>
          <div className="log-drawer-field">
            <span className="log-drawer-label">Level</span>
            <span
              className="log-drawer-badge"
              style={{
                background: `${LEVEL_COLORS[level] || LEVEL_COLORS.info}22`,
                color: LEVEL_COLORS[level] || LEVEL_COLORS.info,
                borderColor: `${LEVEL_COLORS[level] || LEVEL_COLORS.info}66`,
              }}
            >
              {(log.level || 'info').toUpperCase()}
            </span>
          </div>
          <div className="log-drawer-field">
            <span className="log-drawer-label">Service</span>
            <span className="log-drawer-value">{log.service ?? '—'}</span>
          </div>
          <div className="log-drawer-field">
            <span className="log-drawer-label">Message</span>
            <span className="log-drawer-value log-drawer-message">{log.message ?? '—'}</span>
          </div>
          <div className="log-drawer-field">
            <span className="log-drawer-label">Duration</span>
            <span className="log-drawer-value">{log.duration != null ? `${log.duration} ms` : '—'}</span>
          </div>
          <div className="log-drawer-field">
            <span className="log-drawer-label">Trace ID</span>
            <span className="log-drawer-value log-drawer-monospace">{log.traceId ?? '—'}</span>
          </div>
          {isError && (
            <div className="log-drawer-field">
              <span className="log-drawer-label">Stack Trace</span>
              <pre className="log-drawer-stack">{log.stackTrace ?? log.stack ?? 'Stack trace not available'}</pre>
            </div>
          )}
          <button className="log-drawer-copy-btn" onClick={handleCopyJson}>
            <Copy className="w-4 h-4" />
            Copy as JSON
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LogsPage() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [service, setService] = useState('')
  const [timeRange, setTimeRange] = useState('')
  const [page, setPage] = useState(0)
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [services, setServices] = useState([
    'auth-service',
    'payment-service',
    'api-gateway',
    'user-service',
    'notification-service',
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [copyToast, setCopyToast] = useState(false)
  const debounceRef = useRef(null)
  const PAGE_SIZE = 50

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/dashboard/services')
      setServices((data.data ?? []).map((d) => d.name))
    } catch {
      setServices(['auth-service', 'payment-service', 'api-gateway', 'user-service', 'notification-service'])
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('from', String(page * PAGE_SIZE))
      params.set('size', String(PAGE_SIZE))
      if (search.trim()) params.set('q', search.trim())
      if (level) params.set('level', level)
      if (service) params.set('service', service)
      if (timeRange) params.set('timeRange', timeRange)
      const { data } = await axiosInstance.get(`/logs?${params}`)
      setLogs(data.hits ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err?.message || 'Failed to fetch logs')
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, search, level, service, timeRange])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = search.trim() ? 300 : 0
    debounceRef.current = setTimeout(fetchLogs, delay)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchLogs, page, search, level, service, timeRange])

  useEffect(() => {
    const interval = setInterval(fetchLogs, 10000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  const handleCopyTraceId = (traceId) => {
    if (traceId) {
      navigator.clipboard.writeText(traceId)
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 1500)
    }
  }

  const start = total === 0 ? 0 : page * PAGE_SIZE + 1
  const end = Math.min((page + 1) * PAGE_SIZE, total)
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="log-explorer">
      <style>{`
        .log-explorer { background: #0B0F1A; min-height: 100%; }
        .log-explorer-bar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .log-explorer-search-wrap {
          flex: 1;
          min-width: 200px;
          position: relative;
        }
        .log-explorer-search {
          width: 100%;
          padding: 0.625rem 1rem 0.625rem 2.75rem;
          background: #1A2235;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
          color: #fff;
          font-size: 0.9375rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .log-explorer-search::placeholder { color: #64748b; }
        .log-explorer-search:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
        }
        .log-explorer-search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
        }
        .log-explorer-select {
          padding: 0.625rem 2rem 0.625rem 0.75rem;
          background: #1A2235;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
          color: #e2e8f0;
          font-size: 0.875rem;
          min-width: 120px;
          cursor: pointer;
        }
        .log-explorer-select:focus { outline: none; border-color: rgba(59, 130, 246, 0.5); }
        .log-explorer-result-count {
          color: #94a3b8;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .log-explorer-table-wrap {
          background: #1A2235;
          border-radius: 0.75rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
          overflow: hidden;
        }
        .log-explorer-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
        }
        .log-explorer-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.2);
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .log-explorer-table td {
          padding: 0.625rem 1rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          color: #94a3b8;
          vertical-align: middle;
        }
        .log-explorer-table tr.log-row-clickable {
          cursor: pointer;
          transition: background 0.15s;
        }
        .log-explorer-table tr.log-row-clickable:hover {
          background: rgba(255,255,255,0.04);
        }
        .log-cell-time { width: 155px; color: #64748b; white-space: nowrap; }
        .log-cell-level { width: 90px; }
        .log-cell-service { width: 150px; }
        .log-cell-message { color: #e2e8f0; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .log-cell-duration { width: 70px; color: #94a3b8; }
        .log-cell-trace { width: 130px; }
        .log-badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .log-service-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .log-service-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .log-trace-cell {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .log-trace-cell span { color: #64748b; }
        .log-trace-copy {
          opacity: 0;
          padding: 0.2rem;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: opacity 0.15s, color 0.15s;
        }
        .log-trace-cell:hover .log-trace-copy { opacity: 1; }
        .log-trace-copy:hover { color: #3b82f6; }
        .log-explorer-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1rem;
          padding: 0.75rem 0;
          color: #94a3b8;
          font-size: 0.875rem;
        }
        .log-explorer-pagination-btns {
          display: flex;
          gap: 0.5rem;
        }
        .log-explorer-pagination-btn {
          padding: 0.375rem 0.75rem;
          background: #1A2235;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
          color: #e2e8f0;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: border-color 0.2s, background 0.2s;
        }
        .log-explorer-pagination-btn:hover:not(:disabled) {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(59, 130, 246, 0.1);
        }
        .log-explorer-pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .log-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
          animation: drawerFadeIn 0.2s ease;
        }
        @keyframes drawerFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .log-drawer {
          width: 480px;
          max-width: 100%;
          background: #1A2235;
          border-left: 1px solid rgba(59, 130, 246, 0.2);
          box-shadow: -8px 0 32px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          animation: drawerSlideIn 0.25s ease;
        }
        @keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .log-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .log-drawer-title { font-size: 1.125rem; font-weight: 600; color: #fff; margin: 0; }
        .log-drawer-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 1.5rem;
          cursor: pointer;
          border-radius: 0.375rem;
          transition: color 0.2s, background 0.2s;
        }
        .log-drawer-close:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .log-drawer-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
        .log-drawer-field {
          margin-bottom: 1.25rem;
        }
        .log-drawer-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.375rem;
        }
        .log-drawer-value { color: #e2e8f0; font-size: 0.875rem; }
        .log-drawer-message { word-break: break-word; white-space: pre-wrap; }
        .log-drawer-monospace { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8125rem; }
        .log-drawer-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid;
        }
        .log-drawer-stack {
          background: rgba(0,0,0,0.3);
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          color: #94a3b8;
          overflow-x: auto;
          margin: 0;
          font-family: 'SF Mono', 'Fira Code', monospace;
          line-height: 1.6;
          white-space: pre;
        }
        .log-drawer-copy-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          color: #60a5fa;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 1rem;
          transition: background 0.2s, border-color 0.2s;
        }
        .log-drawer-copy-btn:hover {
          background: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.5);
        }
        .log-copy-toast {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 0.75rem 1.25rem;
          background: #1A2235;
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 0.5rem;
          color: #22c55e;
          font-size: 0.875rem;
          z-index: 101;
          animation: toastIn 0.2s ease;
        }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="log-explorer-bar">
        <div className="log-explorer-search-wrap">
          <Search className="log-explorer-search-icon w-5 h-5" />
          <input
            type="text"
            className="log-explorer-search"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <select
          className="log-explorer-select"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value)
            setPage(0)
          }}
        >
          {LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="log-explorer-select"
          value={service}
          onChange={(e) => {
            setService(e.target.value)
            setPage(0)
          }}
        >
          <option value="">All Services</option>
          {services.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="log-explorer-select"
          value={timeRange}
          onChange={(e) => {
            setTimeRange(e.target.value)
            setPage(0)
          }}
        >
          {TIME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <p className="log-explorer-result-count">
        Showing {start}-{end} of {total.toLocaleString()} results
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error} — Ensure backend is running at {API_BASE}
        </div>
      )}

      <div className="log-explorer-table-wrap">
        <table className="log-explorer-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Level</th>
              <th>Service</th>
              <th>Message</th>
              <th>Duration</th>
              <th>Trace ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12" style={{ color: '#64748b' }}>
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12" style={{ color: '#64748b' }}>
                  No logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const lvl = (log.level || 'info').toLowerCase()
                const color = LEVEL_COLORS[lvl] ?? LEVEL_COLORS.info
                const svcIndex = services.indexOf(log.service)
                const svcColor = SERVICE_COLORS[svcIndex % SERVICE_COLORS.length] ?? SERVICE_COLORS[0]
                return (
                  <tr
                    key={log.id ?? log.traceId ?? Math.random()}
                    className="log-row-clickable"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="log-cell-time">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="log-cell-level">
                      <span
                        className="log-badge"
                        style={{
                          background: `${color}22`,
                          color,
                          border: `1px solid ${color}66`,
                        }}
                      >
                        {(log.level || 'info').toUpperCase()}
                      </span>
                    </td>
                    <td className="log-cell-service">
                      <div className="log-service-cell">
                        <span
                          className="log-service-dot"
                          style={{ background: svcColor }}
                        />
                        {log.service ?? '—'}
                      </div>
                    </td>
                    <td className="log-cell-message" title={log.message}>
                      {log.message ?? '—'}
                    </td>
                    <td className="log-cell-duration">
                      {log.duration != null ? `${log.duration} ms` : '—'}
                    </td>
                    <td className="log-cell-trace">
                      <div className="log-trace-cell">
                        <span>{truncateTraceId(log.traceId)}</span>
                        <button
                          className="log-trace-copy"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyTraceId(log.traceId)
                          }}
                          title="Copy Trace ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="log-explorer-pagination">
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <div className="log-explorer-pagination-btns">
          <button
            className="log-explorer-pagination-btn"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            className="log-explorer-pagination-btn"
            disabled={page >= totalPages - 1 || total === 0}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selectedLog && (
        <LogDetailDrawer
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onCopy={() => {
            setCopyToast(true)
            setTimeout(() => setCopyToast(false), 1500)
          }}
        />
      )}

      {copyToast && (
        <div className="log-copy-toast">Copied to clipboard</div>
      )}
    </div>
  )
}
