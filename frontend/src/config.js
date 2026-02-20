/**
 * API base URL. Use VITE_API_URL in production (e.g. Vercel env var).
 * Default: http://localhost:3001 for local development.
 */
export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : 'http://localhost:3001/api'
