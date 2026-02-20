import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LTLogo from '../components/LTLogo'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const LEVEL_COLORS = { ERROR: '#ef4444', WARN: '#eab308', INFO: '#22c55e', DEBUG: '#6b7280' }

const FAKE_LOG_ROWS = [
  { level: 'INFO', time: '14:32:01', service: 'auth-service', msg: 'Session validated user_id=4821' },
  { level: 'ERROR', time: '14:32:00', service: 'payment-service', msg: 'DB connection timeout' },
  { level: 'WARN', time: '14:31:59', service: 'api-gateway', msg: 'Rate limit 80% 192.168.1.42' },
  { level: 'INFO', time: '14:31:58', service: 'user-service', msg: 'Cache hit profile usr_4821' },
  { level: 'DEBUG', time: '14:31:57', service: 'notification-service', msg: 'Email queued delivery' },
]

const SERVICE_DATA = [
  { name: 'auth', value: 4200, fill: '#3b82f6' },
  { name: 'payment', value: 2800, fill: '#8b5cf6' },
  { name: 'api-gateway', value: 5100, fill: '#06b6d4' },
  { name: 'user', value: 1900, fill: '#22c55e' },
  { name: 'notify', value: 1100, fill: '#eab308' },
]

function generateVolumeData() {
  const data = []
  const base = 800 + Math.random() * 400
  for (let i = 0; i < 24; i++) {
    const spike = i === 12 || i === 18 ? 1.8 + Math.random() * 0.4 : 1
    data.push({
      time: `${i}:00`,
      volume: Math.round(base * spike * (0.7 + Math.random() * 0.6)),
    })
  }
  return data
}

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [volumeData, setVolumeData] = useState(() => generateVolumeData())
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
      return
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const t = setInterval(() => {
      setVolumeData(generateVolumeData())
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!name.trim()) {
      setError('Name is required')
      setLoading(false)
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }
    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-split-page">
      <div className="login-orbs">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`login-orb login-orb-${i + 1}`} />
        ))}
      </div>

      <aside className="login-left">
        <div className="login-dashboard-wrap">
          <div className="login-dashboard-tilted">
            <div className="login-mini-dashboard">
              <div className="login-dashboard-row">
                <div className="login-dashboard-chart">
                  <div className="login-dashboard-chart-title">Log Volume</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={volumeData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="signupAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} />
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Tooltip
                        contentStyle={{
                          background: '#1A2235',
                          border: '1px solid rgba(59,130,246,0.3)',
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(v) => [v, 'logs']}
                      />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#signupAreaGrad)"
                        isAnimationActive
                        animationDuration={800}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="login-dashboard-stats">
                  <div className="login-mini-stat login-mini-stat-blue">
                    <span className="login-mini-stat-val">10,247</span>
                    <span className="login-mini-stat-label">logs/min</span>
                  </div>
                  <div className="login-mini-stat login-mini-stat-green">
                    <span className="login-mini-stat-val">0.3%</span>
                    <span className="login-mini-stat-label">error rate</span>
                  </div>
                </div>
              </div>
              <div className="login-dashboard-row2">
                <div className="login-dashboard-bars">
                  <div className="login-dashboard-chart-title">Services</div>
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={SERVICE_DATA} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide domain={[0, 6000]} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} width={50} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="login-dashboard-logs">
                  <div className="login-dashboard-chart-title">Live Logs</div>
                  <div className="login-mini-log-table">
                    {FAKE_LOG_ROWS.map((row, i) => (
                      <div key={i} className="login-mini-log-row" style={{ color: LEVEL_COLORS[row.level] }}>
                        <span className="login-mini-log-time">{row.time}</span>
                        <span className="login-mini-log-badge">{row.level}</span>
                        <span className="login-mini-log-svc">{row.service}</span>
                        <span className="login-mini-log-msg">{row.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <aside className="login-right">
        <div className="login-right-card">
          <div className="login-right-header">
            <div className="login-right-logo-row">
              <LTLogo textSize="1.75rem" />
            </div>
            <p className="login-right-tagline">
              Create an account to start monitoring logs.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="login-right-form">
            <div>
              <label htmlFor="name" className="login-right-label">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="login-right-input"
                autoComplete="name"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="email" className="login-right-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="login-right-input"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="login-right-label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-right-input"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="login-right-label">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="login-right-input"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            {error && <p className="login-right-error">{error}</p>}
            <button type="submit" disabled={loading} className="login-right-btn">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <p className="login-right-signup">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </aside>

      <style>{`
        .login-split-page {
          min-height: 100vh;
          display: flex;
          background: #0B0F1A;
          position: relative;
          overflow: hidden;
        }

        .login-orbs {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }
        .login-orb-1 { width: 400px; height: 400px; background: #3b82f6; left: 10%; top: 20%; animation: orb1 25s ease-in-out infinite; }
        .login-orb-2 { width: 300px; height: 300px; background: #8b5cf6; right: 15%; top: 30%; animation: orb2 30s ease-in-out infinite; }
        .login-orb-3 { width: 350px; height: 350px; background: #06b6d4; left: 30%; bottom: 20%; animation: orb3 28s ease-in-out infinite; }
        .login-orb-4 { width: 250px; height: 250px; background: #6366f1; right: 40%; top: 60%; animation: orb4 22s ease-in-out infinite; }
        .login-orb-5 { width: 320px; height: 320px; background: #7c3aed; left: 5%; bottom: 40%; animation: orb5 26s ease-in-out infinite; }
        .login-orb-6 { width: 280px; height: 280px; background: #0ea5e9; right: 5%; bottom: 25%; animation: orb6 24s ease-in-out infinite; }
        .login-orb-7 { width: 200px; height: 200px; background: #a855f7; left: 50%; top: 10%; animation: orb7 20s ease-in-out infinite; }
        .login-orb-8 { width: 350px; height: 350px; background: #2563eb; right: 25%; bottom: 5%; animation: orb8 27s ease-in-out infinite; }
        .login-orb-9 { width: 180px; height: 180px; background: #06b6d4; left: 40%; top: 50%; animation: orb9 23s ease-in-out infinite; }
        .login-orb-10 { width: 220px; height: 220px; background: #4f46e5; right: 50%; top: 15%; animation: orb10 21s ease-in-out infinite; }
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-60px) scale(1.1)} 66%{transform:translate(-30px,40px) scale(0.95)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,30px) scale(1.05)} 66%{transform:translate(20px,-40px) scale(0.98)} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-60px,-20px) scale(1.08)} }
        @keyframes orb4 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,50px) scale(1.1)} }
        @keyframes orb5 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(50px,20px)} 66%{transform:translate(-20px,-50px)} }
        @keyframes orb6 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,-30px) scale(1.05)} }
        @keyframes orb7 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(60px,10px) scale(1.15)} }
        @keyframes orb8 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-25px,-60px)} 66%{transform:translate(45px,25px)} }
        @keyframes orb9 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-35px,45px) scale(1.12)} }
        @keyframes orb10 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-35px) scale(1.08)} }

        .login-left {
          width: 60%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          overflow: visible;
          padding: 2rem;
        }
        .login-dashboard-wrap {
          width: 100%;
          max-width: 720px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1200px;
        }
        .login-dashboard-tilted {
          opacity: 0.7;
          transform: perspective(1000px) rotateX(15deg) rotateY(-8deg) scale(1.05);
          transform-style: preserve-3d;
          width: 100%;
          max-width: 680px;
          margin-right: -5%;
          box-shadow:
            0 0 80px rgba(59, 130, 246, 0.25),
            0 40px 80px rgba(0, 0, 0, 0.5);
          border-radius: 1rem;
          overflow: hidden;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .login-mini-dashboard {
          background: rgba(26, 34, 53, 0.95);
          border-radius: 1rem;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .login-dashboard-chart-title {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }
        .login-dashboard-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          align-items: stretch;
        }
        .login-dashboard-chart {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 0.5rem;
          padding: 0.75rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .login-dashboard-stats {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .login-mini-stat {
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          min-width: 100px;
          text-align: center;
        }
        .login-mini-stat-blue {
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
        }
        .login-mini-stat-green {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.3);
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.15);
        }
        .login-mini-stat-val {
          display: block;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .login-mini-stat-label {
          font-size: 0.625rem;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .login-dashboard-row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .login-dashboard-bars {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 0.5rem;
          padding: 0.75rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .login-dashboard-logs {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 0.5rem;
          padding: 0.75rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .login-mini-log-table {
          font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
          font-size: 0.6875rem;
        }
        .login-mini-log-row {
          display: grid;
          grid-template-columns: 48px 42px 1fr;
          gap: 0.5rem;
          padding: 0.25rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          align-items: center;
        }
        .login-mini-log-row:last-child { border-bottom: none; }
        .login-mini-log-time { color: #64748b; }
        .login-mini-log-badge {
          font-weight: 600;
          font-size: 0.5625rem;
        }
        .login-mini-log-svc { color: #94a3b8; }
        .login-mini-log-msg {
          grid-column: 2 / -1;
          color: inherit;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .login-right {
          width: 40%;
          min-width: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          position: relative;
          z-index: 2;
        }
        .login-right-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          background: rgba(26, 34, 53, 0.8);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 1.25rem;
          border: 1px solid rgba(59, 130, 246, 0.2);
          box-shadow:
            0 0 0 1px rgba(59, 130, 246, 0.1),
            0 0 60px rgba(59, 130, 246, 0.15),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .login-right-header { margin-bottom: 2rem; }
        .login-right-logo-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.375rem;
        }
        .login-right-tagline {
          color: #94a3b8;
          font-size: 0.875rem;
          margin: 0;
        }
        .login-right-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .login-right-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 0.375rem;
        }
        .login-right-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.5);
          border-radius: 0.5rem;
          color: #fff;
          font-size: 0.9375rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .login-right-input::placeholder { color: #64748b; }
        .login-right-input:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        .login-right-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-right-error { font-size: 0.875rem; color: #f87171; margin: 0; }
        .login-right-btn {
          width: 100%;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border: none;
          border-radius: 0.5rem;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
        }
        .login-right-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(37, 99, 235, 0.5);
        }
        .login-right-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .login-right-signup {
          text-align: center;
          font-size: 0.875rem;
          color: #94a3b8;
          margin: 0;
        }
        .login-right-signup a {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 500;
        }
        .login-right-signup a:hover { text-decoration: underline; }

        @media (max-width: 1024px) {
          .login-split-page { flex-direction: column; }
          .login-left { width: 100%; padding: 2rem 1rem; }
          .login-dashboard-tilted { transform: none; opacity: 0.9; }
          .login-right { width: 100%; min-width: auto; padding: 2rem; }
        }
      `}</style>
    </div>
  )
}
