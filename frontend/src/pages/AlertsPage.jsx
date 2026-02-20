import { useState, useEffect, useCallback } from 'react'
import axiosInstance from '../utils/axiosInstance'
import { Bell, AlertTriangle, CheckCircle, Plus } from 'lucide-react'
import { API_BASE } from '../config'

const SERVICES = [
  'auth-service',
  'payment-service',
  'api-gateway',
  'user-service',
  'notification-service',
]

const METRICS = ['Error Rate', 'Response Time', 'Log Volume']

const INITIAL_ALERTS = [
  { id: 1, name: 'Error Rate > 10%', service: 'payment-service', metric: 'Error Rate', threshold: 10, condition: 'Error Rate > 10%', status: 'ACTIVE', lastTriggered: null },
  { id: 2, name: 'Response Time > 500ms', service: 'api-gateway', metric: 'Response Time', threshold: 500, condition: 'Response Time > 500ms', status: 'ACTIVE', lastTriggered: null },
  { id: 3, name: 'Log Volume Drop', service: 'auth-service', metric: 'Log Volume', threshold: 100, condition: 'Log Volume < 100/min', status: 'ACTIVE', lastTriggered: null },
  { id: 4, name: 'High Error Rate', service: 'user-service', metric: 'Error Rate', threshold: 5, condition: 'Error Rate > 5%', status: 'RESOLVED', lastTriggered: '2025-02-19T14:32:00' },
  { id: 5, name: 'DB Connection Timeout', service: 'payment-service', metric: 'Error Rate', threshold: 20, condition: 'Error Rate > 20%', status: 'ACTIVE', lastTriggered: null },
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS)
  const [paymentErrorRate, setPaymentErrorRate] = useState(0)
  const [form, setForm] = useState({ name: '', service: '', metric: '', threshold: '' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState('')

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/services')
      const payment = (data.services ?? []).find((s) => s.name === 'payment-service')
      setPaymentErrorRate(payment?.errorRate ?? 0)
      setError(null)
    } catch {
      setPaymentErrorRate(0)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  useEffect(() => {
    const interval = setInterval(fetchServices, 30000)
    return () => clearInterval(interval)
  }, [fetchServices])

  const alertsWithStatus = alerts.map((a) => {
    if (a.overrideStatus) return { ...a, status: a.overrideStatus }
    if (a.service === 'payment-service' && a.metric === 'Error Rate' && a.threshold === 10) {
      const triggered = paymentErrorRate > 10
      return {
        ...a,
        status: triggered ? 'TRIGGERED' : 'ACTIVE',
        lastTriggered: triggered ? new Date().toISOString() : a.lastTriggered,
      }
    }
    return a
  })

  const activeCount = alertsWithStatus.filter((a) => a.status === 'ACTIVE').length
  const triggeredCount = alertsWithStatus.filter((a) => a.status === 'TRIGGERED').length
  const triggeredToday = alertsWithStatus.filter((a) => {
    if (a.status !== 'TRIGGERED') return false
    const d = a.lastTriggered ? new Date(a.lastTriggered) : null
    return d && d.toDateString() === new Date().toDateString()
  }).length
  const resolvedToday = alertsWithStatus.filter((a) => a.status === 'RESOLVED').length

  const handleSave = (e) => {
    e.preventDefault()
    setFormError('')
    const trimmedName = form.name.trim()
    const thresholdVal = String(form.threshold).trim()
    if (!trimmedName) {
      setFormError('Alert name is required')
      return
    }
    if (!form.service) {
      setFormError('Please select a service')
      return
    }
    if (!form.metric) {
      setFormError('Please select a metric')
      return
    }
    if (thresholdVal === '' || isNaN(Number(thresholdVal)) || Number(thresholdVal) < 0) {
      setFormError('Please enter a valid threshold (0 or greater)')
      return
    }
    const condition =
      form.metric === 'Error Rate'
        ? `Error Rate > ${form.threshold}%`
        : form.metric === 'Response Time'
        ? `Response Time > ${form.threshold}ms`
        : `Log Volume < ${form.threshold}/min`
    const existing = editingId ? alerts.find((a) => a.id === editingId) : null
    const newAlert = {
      id: editingId ?? Date.now(),
      name: trimmedName,
      service: form.service,
      metric: form.metric,
      threshold: Number(thresholdVal),
      condition,
      status: existing?.status ?? 'ACTIVE',
      lastTriggered: existing?.lastTriggered ?? null,
      overrideStatus: existing?.overrideStatus ?? undefined,
    }
    if (editingId) {
      setAlerts((prev) => prev.map((a) => (a.id === editingId ? newAlert : a)))
    } else {
      setAlerts((prev) => [...prev, newAlert])
    }
    setForm({ name: '', service: '', metric: '', threshold: '' })
    setEditingId(null)
    setFormError('')
  }

  const handleEdit = (alert) => {
    setForm({
      name: alert.name,
      service: alert.service,
      metric: alert.metric,
      threshold: String(alert.threshold ?? ''),
    })
    setEditingId(alert.id)
    setFormError('')
  }

  const handleDelete = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    if (editingId === id) {
      setForm({ name: '', service: '', metric: '', threshold: '' })
      setEditingId(null)
      setFormError('')
    }
  }

  const handleMarkResolved = (alert) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id ? { ...a, overrideStatus: 'RESOLVED', lastTriggered: new Date().toISOString() } : a
      )
    )
  }

  const handleMarkActive = (alert) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alert.id ? { ...a, overrideStatus: null, status: 'ACTIVE', lastTriggered: null } : a
      )
    )
  }

  return (
    <div className="alerts-page">
      <style>{`
        .alerts-page { background: #0B0F1A; min-height: 100%; }
        .alerts-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        @media (max-width: 768px) { .alerts-summary { grid-template-columns: 1fr; } }
        .alerts-summary-card {
          background: #1A2235;
          border-radius: 0.75rem;
          padding: 1.25rem;
          border-left: 4px solid;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .alerts-summary-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          background: rgba(255,255,255,0.05);
        }
        .alerts-summary-val { font-size: 1.75rem; font-weight: 700; color: #fff; }
        .alerts-summary-lbl { font-size: 0.8125rem; color: #94a3b8; margin-top: 0.25rem; }
        .alerts-table-wrap {
          background: #1A2235;
          border-radius: 0.75rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .alerts-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .alerts-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.2);
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .alerts-table td { padding: 0.75rem 1rem; border-top: 1px solid rgba(255,255,255,0.05); color: #94a3b8; vertical-align: middle; }
        .alerts-status-badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.6875rem;
          font-weight: 600;
        }
        .alerts-status-active { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.4); }
        .alerts-status-triggered {
          background: rgba(239,68,68,0.2);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.4);
          animation: alertsTriggeredPulse 2s ease-in-out infinite;
        }
        @keyframes alertsTriggeredPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.4); }
        }
        .alerts-status-resolved { background: rgba(107, 114, 128, 0.2); color: #94a3b8; border: 1px solid rgba(107, 114, 128, 0.4); }
        .alerts-form-card {
          background: #1A2235;
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        .alerts-form-title { font-size: 1rem; font-weight: 600; color: #fff; margin: 0 0 1rem 0; }
        .alerts-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; align-items: end; }
        .alerts-form-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .alerts-form-label { font-size: 0.8125rem; font-weight: 500; color: #94a3b8; }
        .alerts-form-input, .alerts-form-select {
          padding: 0.625rem 0.75rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
          color: #fff;
          font-size: 0.875rem;
        }
        .alerts-form-input:focus, .alerts-form-select:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.5);
        }
        .alerts-form-btn {
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border: none;
          border-radius: 0.5rem;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: opacity 0.2s, transform 0.1s;
        }
        .alerts-form-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .alerts-actions-btn {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.25rem;
          color: #60a5fa;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .alerts-actions-btn:hover { background: rgba(59, 130, 246, 0.1); }
      `}</style>

      <h1 className="text-2xl font-bold text-white mb-6">Alerts</h1>

      <div className="alerts-summary">
        <div className="alerts-summary-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="alerts-summary-icon" style={{ color: '#3b82f6' }}>
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="alerts-summary-val">{activeCount + triggeredCount}</div>
            <div className="alerts-summary-lbl">Active Alerts</div>
          </div>
        </div>
        <div className="alerts-summary-card" style={{ borderLeftColor: '#ef4444' }}>
          <div className="alerts-summary-icon" style={{ color: '#ef4444' }}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="alerts-summary-val">{triggeredToday}</div>
            <div className="alerts-summary-lbl">Triggered Today</div>
          </div>
        </div>
        <div className="alerts-summary-card" style={{ borderLeftColor: '#22c55e' }}>
          <div className="alerts-summary-icon" style={{ color: '#22c55e' }}>
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="alerts-summary-val">{resolvedToday}</div>
            <div className="alerts-summary-lbl">Resolved Today</div>
          </div>
        </div>
      </div>

      <div className="alerts-table-wrap">
        <table className="alerts-table">
          <thead>
            <tr>
              <th>Alert Name</th>
              <th>Service</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Last Triggered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alertsWithStatus.map((alert) => (
              <tr key={alert.id}>
                <td style={{ color: '#e2e8f0' }}>{alert.name}</td>
                <td>{alert.service}</td>
                <td>{alert.condition}</td>
                <td>
                  <span
                    className={`alerts-status-badge alerts-status-${alert.status.toLowerCase()}`}
                  >
                    {alert.status}
                  </span>
                </td>
                <td>
                  {alert.lastTriggered
                    ? new Date(alert.lastTriggered).toLocaleString()
                    : '—'}
                </td>
                <td>
                  <button
                    type="button"
                    className="alerts-actions-btn"
                    onClick={(e) => { e.stopPropagation(); handleEdit(alert); }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="alerts-actions-btn"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(alert.id); }}
                  >
                    Delete
                  </button>
                  {alert.status === 'TRIGGERED' && (
                    <button
                      type="button"
                      className="alerts-actions-btn"
                      style={{ marginLeft: '0.5rem', color: '#22c55e' }}
                      onClick={(e) => { e.stopPropagation(); handleMarkResolved(alert); }}
                    >
                      Mark Resolved
                    </button>
                  )}
                  {alert.status === 'RESOLVED' && (
                    <button
                      type="button"
                      className="alerts-actions-btn"
                      style={{ marginLeft: '0.5rem' }}
                      onClick={(e) => { e.stopPropagation(); handleMarkActive(alert); }}
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="alerts-form-card">
        <h2 className="alerts-form-title">Create New Alert Rule</h2>
        {formError && (
          <div style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}
        <form onSubmit={handleSave} className="alerts-form">
          <div className="alerts-form-group">
            <label className="alerts-form-label">Alert Name</label>
            <input
              type="text"
              className="alerts-form-input"
              placeholder="e.g. High Error Rate"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="alerts-form-group">
            <label className="alerts-form-label">Service</label>
            <select
              className="alerts-form-select"
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
            >
              <option value="">Select service</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="alerts-form-group">
            <label className="alerts-form-label">Metric</label>
            <select
              className="alerts-form-select"
              value={form.metric}
              onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
            >
              <option value="">Select metric</option>
              {METRICS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="alerts-form-group">
            <label className="alerts-form-label">Threshold</label>
            <input
              type="number"
              className="alerts-form-input"
              placeholder={form.metric === 'Error Rate' ? '10' : form.metric === 'Response Time' ? '500' : '100'}
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
            />
          </div>
          <button type="submit" className="alerts-form-btn">
            <Plus className="w-4 h-4" />
            {editingId ? 'Update' : 'Save'}
          </button>
          {editingId && (
            <button
              type="button"
              className="alerts-form-btn"
              style={{ background: 'rgba(107, 114, 128, 0.3)' }}
              onClick={() => { setForm({ name: '', service: '', metric: '', threshold: '' }); setEditingId(null); setFormError(''); }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
