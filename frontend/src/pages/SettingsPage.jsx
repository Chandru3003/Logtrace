import { useState, useEffect, useCallback } from 'react'
import axiosInstance from '../utils/axiosInstance'
import { Database, HardDrive, Trash2, Info, Save, Play, Zap } from 'lucide-react'
import { API_BASE } from '../config'

const SERVICES = [
  'auth-service',
  'payment-service',
  'api-gateway',
  'user-service',
  'notification-service',
]

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

const BYTES_PER_LOG = 500
const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB for progress bar

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function SettingsPage() {
  const [totalLogs, setTotalLogs] = useState(0)
  const [policies, setPolicies] = useState({})
  const [policyEdits, setPolicyEdits] = useState({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState(null)
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedResult, setSeedResult] = useState(null)
  const [demoLogsEnabled, setDemoLogsEnabled] = useState(false)
  const [demoLogsLoading, setDemoLogsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchTotalLogs = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/logs', {
        params: { size: 0, from: 0 },
      })
      setTotalLogs(data.total ?? 0)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const fetchPolicies = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/retention')
      const pol = data.policies ?? {}
      setPolicies(pol)
      const edits = {}
      SERVICES.forEach((s) => {
        edits[s] = pol[s]?.retentionDays ?? 30
      })
      setPolicyEdits(edits)
      setError(null)
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'Retention API not available. Restart the backend to load the updated routes.'
        : err.response?.data?.error ?? err.message
      setError(msg)
      // Fallback: use defaults so the form still works
      const defaults = {}
      SERVICES.forEach((s) => { defaults[s] = 30 })
      setPolicyEdits(defaults)
    }
  }, [])

  useEffect(() => {
    fetchTotalLogs()
  }, [fetchTotalLogs])

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  const fetchSimulatorStatus = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/simulator/status')
      setDemoLogsEnabled(data.enabled ?? false)
    } catch {
      setDemoLogsEnabled(false)
    }
  }, [])

  useEffect(() => {
    fetchSimulatorStatus()
  }, [fetchSimulatorStatus])

  const handleDemoLogsToggle = async () => {
    setDemoLogsLoading(true)
    setError(null)
    try {
      const enabled = !demoLogsEnabled
      await axiosInstance.post(`/simulator/${enabled ? 'enable' : 'disable'}`)
      setDemoLogsEnabled(enabled)
      if (enabled) await fetchTotalLogs()
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setDemoLogsLoading(false)
    }
  }

  const estimatedSize = totalLogs * BYTES_PER_LOG
  const usagePercent = Math.min(100, (estimatedSize / STORAGE_LIMIT_BYTES) * 100)

  // Compute retention savings from last cleanup run
  const totalDeletedFromCleanup = Object.values(policies).reduce(
    (sum, p) => sum + (p.logsDeletedLastRun || 0),
    0
  )
  const estimatedSavedBytes = totalDeletedFromCleanup * BYTES_PER_LOG
  const totalWouldHave = totalLogs + totalDeletedFromCleanup
  const savingsPercent =
    totalWouldHave > 0 ? ((totalDeletedFromCleanup / totalWouldHave) * 100).toFixed(0) : null

  const handlePolicyChange = (service, days) => {
    setPolicyEdits((p) => ({ ...p, [service]: parseInt(days, 10) }))
  }

  const handleSavePolicies = async () => {
    setSaveLoading(true)
    setSaveSuccess(false)
    setError(null)
    try {
      const payload = SERVICES.map((s) => ({
        service: s,
        retentionDays: policyEdits[s] ?? policies[s]?.retentionDays ?? 30,
      }))
      await axiosInstance.post('/retention', { policies: payload })
      await fetchPolicies()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'Retention API not available. Restart the backend to load the updated routes.'
        : err.response?.data?.error ?? err.message
      setError(msg)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleRunCleanup = async () => {
    setCleanupLoading(true)
    setCleanupResult(null)
    setError(null)
    try {
      const { data } = await axiosInstance.post('/retention/cleanup')
      setCleanupResult(data)

      await fetchTotalLogs()
      await fetchPolicies()
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'Retention API not available. Restart the backend to load the updated routes.'
        : err.response?.data?.error ?? err.message
      setError(msg)
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <style>{`
        .settings-page { background: #0B0F1A; min-height: 100%; }
        .settings-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          color: #93c5fd;
          font-size: 0.9375rem;
        }
        .settings-banner svg { flex-shrink: 0; color: #60a5fa; }
        .settings-card {
          background: #1A2235;
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid rgba(59, 130, 246, 0.1);
          margin-bottom: 1.5rem;
        }
        .settings-card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #fff;
          margin: 0 0 1.25rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .settings-card-title svg { color: #60a5fa; }
        .settings-overview-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 768px) { .settings-overview-grid { grid-template-columns: 1fr; } }
        .settings-stat {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 0.5rem;
          padding: 1rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .settings-stat-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
        .settings-stat-value { font-size: 1.5rem; font-weight: 700; color: #fff; }
        .settings-progress-wrap { margin-top: 0.5rem; }
        .settings-progress-bar {
          height: 8px;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 4px;
          overflow: hidden;
        }
        .settings-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .settings-progress-label { font-size: 0.75rem; color: #94a3b8; margin-top: 0.375rem; }
        .settings-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .settings-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background: rgba(0,0,0,0.2);
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .settings-table td { padding: 0.75rem 1rem; border-top: 1px solid rgba(255,255,255,0.05); color: #94a3b8; vertical-align: middle; }
        .settings-table select {
          padding: 0.5rem 0.75rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.375rem;
          color: #fff;
          font-size: 0.8125rem;
          cursor: pointer;
        }
        .settings-status-badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          background: rgba(34,197,94,0.2);
          color: #22c55e;
          border: 1px solid rgba(34,197,94,0.4);
          border-radius: 0.25rem;
          font-size: 0.6875rem;
          font-weight: 600;
        }
        .settings-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border: none;
          border-radius: 0.5rem;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
          transition: opacity 0.2s, transform 0.1s;
        }
        .settings-save-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .settings-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .settings-save-btn.success { background: linear-gradient(135deg, #16a34a, #15803d); }
        .settings-cleanup-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          border: none;
          border-radius: 0.75rem;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
        }
        .settings-cleanup-btn:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4);
        }
        .settings-cleanup-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .settings-cleanup-result {
          margin-top: 1.25rem;
          padding: 1rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 0.5rem;
          color: #22c55e;
          font-size: 0.9375rem;
        }
        .settings-before-after {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 0.75rem;
          font-size: 0.8125rem;
          color: #94a3b8;
        }
        .settings-error {
          color: #f87171;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
        }
        .settings-toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .settings-toggle-info h3 { font-size: 1rem; color: #fff; margin: 0 0 0.25rem 0; }
        .settings-toggle-info p { font-size: 0.8125rem; color: #94a3b8; margin: 0; }
        .settings-toggle-switch {
          position: relative;
          width: 52px;
          height: 28px;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 14px;
          cursor: pointer;
          border: 1px solid rgba(59, 130, 246, 0.3);
          flex-shrink: 0;
        }
        .settings-toggle-switch.enabled {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-color: rgba(59, 130, 246, 0.5);
        }
        .settings-toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .settings-toggle-switch.enabled::after { transform: translateX(24px); }
        .settings-toggle-switch:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <h1 className="text-2xl font-bold text-white mb-6">Data Retention & TTL Policies</h1>

      <div className="settings-banner">
        <Info className="w-5 h-5" />
        <span>
          {totalDeletedFromCleanup > 0 ? (
            <>
              Retention policies reduce storage overhead{savingsPercent ? ` by ~${savingsPercent}%` : ''} — currently
              saving an estimated <strong>{formatBytes(estimatedSavedBytes)}</strong> from the last cleanup.
            </>
          ) : (
            <>
              Retention policies reduce storage overhead by deleting logs older than the retention period. Run cleanup to see
              your estimated savings.
            </>
          )}
        </span>
      </div>

      {error && <div className="settings-error">{error}</div>}

      <div className="settings-card">
        <h2 className="settings-card-title">
          <Zap className="w-5 h-5" />
          Demo Logs
        </h2>
        <div className="settings-toggle-card">
          <div className="settings-toggle-info">
            <h3>Generate sample logs</h3>
            <p>
              Turn on to stream fake logs from 5 mock services. Use this to explore the dashboard. Off by default for new users.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={demoLogsEnabled}
            className={`settings-toggle-switch ${demoLogsEnabled ? 'enabled' : ''}`}
            onClick={handleDemoLogsToggle}
            disabled={demoLogsLoading}
          />
        </div>
      </div>

      <div className="settings-card">
        <h2 className="settings-card-title">
          <Database className="w-5 h-5" />
          Storage Overview
        </h2>
        <div className="settings-overview-grid">
          <div className="settings-stat">
            <div className="settings-stat-label">Total Logs Stored</div>
            <div className="settings-stat-value">{totalLogs.toLocaleString()}</div>
          </div>
          <div className="settings-stat">
            <div className="settings-stat-label">Estimated Storage Size</div>
            <div className="settings-stat-value">{formatBytes(estimatedSize)}</div>
            <div className="settings-progress-label">
              ~{BYTES_PER_LOG} bytes per log avg
            </div>
          </div>
          <div className="settings-stat">
            <div className="settings-stat-label">Storage Usage</div>
            <div className="settings-progress-wrap">
              <div className="settings-progress-bar">
                <div
                  className="settings-progress-fill"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="settings-progress-label">
                {formatBytes(estimatedSize)} / {formatBytes(STORAGE_LIMIT_BYTES)} ({usagePercent.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2 className="settings-card-title">
          <HardDrive className="w-5 h-5" />
          Retention Policies
        </h2>
        <table className="settings-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Retention Period</th>
              <th>Status</th>
              <th>Last Cleanup Run</th>
              <th>Logs Deleted Last Run</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((service) => (
              <tr key={service}>
                <td style={{ color: '#e2e8f0' }}>{service}</td>
                <td>
                  <select
                    value={policyEdits[service] ?? policies[service]?.retentionDays ?? 30}
                    onChange={(e) => handlePolicyChange(service, e.target.value)}
                  >
                    {RETENTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className="settings-status-badge">Active</span>
                </td>
                <td>
                  {policies[service]?.lastCleanupRun
                    ? new Date(policies[service].lastCleanupRun).toLocaleString()
                    : '—'}
                </td>
                <td>
                  {policies[service]?.logsDeletedLastRun?.toLocaleString() ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className={`settings-save-btn ${saveSuccess ? 'success' : ''}`}
          onClick={handleSavePolicies}
          disabled={saveLoading}
        >
          <Save className="w-4 h-4" />
          {saveLoading ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-card">
        <h2 className="settings-card-title">
          <Trash2 className="w-5 h-5" />
          Manual Cleanup
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Run retention cleanup now to delete logs older than the configured retention period for each service.
        </p>
        <button
          type="button"
          className="settings-cleanup-btn"
          onClick={handleRunCleanup}
          disabled={cleanupLoading}
        >
          <Play className="w-5 h-5" />
          {cleanupLoading ? 'Running Cleanup…' : 'Run Cleanup Now'}
        </button>
        {cleanupResult && (
          <div className="settings-cleanup-result">
            Deleted <strong>{cleanupResult.deleted?.toLocaleString() ?? 0}</strong> logs, saved{' '}
            <strong>{formatBytes(cleanupResult.savedBytes ?? 0)}</strong> of storage
            {cleanupResult.before && cleanupResult.after && (
              <div className="settings-before-after">
                <div>
                  <strong>Before:</strong> {cleanupResult.before.docs?.toLocaleString()} logs,{' '}
                  {formatBytes(cleanupResult.before.size)}
                </div>
                <div>
                  <strong>After:</strong> {cleanupResult.after.docs?.toLocaleString()} logs,{' '}
                  {formatBytes(cleanupResult.after.size)}
                </div>
              </div>
            )}
            {(cleanupResult.deleted ?? 0) === 0 && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', opacity: 0.9 }}>
                No logs were old enough to delete. Reduce the retention period in the table above and run cleanup again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
