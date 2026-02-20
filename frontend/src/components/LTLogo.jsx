import { Link } from 'react-router-dom'

/**
 * LT logo component: 40x40 gradient tile + "LogTrace" text.
 * Pure CSS/JSX, no images. Wrapped in Link to /dashboard.
 */
export default function LTLogo({ className = '', textSize = '22px' }) {
  return (
    <Link
      to="/dashboard"
      className={`lt-logo-link ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        textDecoration: 'none',
      }}
    >
      <div
        className="lt-logo-tile"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          LT
        </span>
      </div>
      <span
        className="lt-logo-text"
        style={{
          fontSize: textSize,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        LogTrace
      </span>
    </Link>
  )
}
