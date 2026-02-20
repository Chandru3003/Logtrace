# LogTrace – Code Audit Report

**Date:** February 2025  
**Scope:** All source files in frontend and backend

---

## Executive Summary

The LogTrace application is functionally sound but has several areas that should be addressed before production deployment: **missing auth guards on API routes**, **hardcoded secrets fallbacks**, **console.log usage**, **incomplete/broken features**, and **UI/UX gaps**.

---

## 1. Broken or Incomplete Features

### 1.1 Dashboard – Missing SVG filter definition
- **File:** `frontend/src/pages/DashboardPage.jsx` (lines 486–489)
- **Issue:** AreaChart components use `filter="url(#areaGlow)"` but there is no `<defs>` block defining `#areaGlow`. The `defs` only define `areaInfo`, `areaWarn`, `areaError`, `areaDebug`.
- **Impact:** May cause console warnings or unexpected chart rendering. Non-critical.
- **Fix:** Add an `areaGlow` filter to the chart `defs`, or remove the `filter` prop from the Area components.

### 1.2 LogsPage – Fake stack trace
- **File:** `frontend/src/pages/LogsPage.jsx` (lines 37–41, 109)
- **Issue:** `FAKE_STACK_TRACE` is hardcoded and shown for all ERROR-level logs, regardless of actual content.
- **Impact:** Misleading; users see fake stack traces instead of real ones.
- **Fix:** Use `log.stackTrace` or `log.stack` when available; otherwise show “Stack trace not available” or omit the section.

### 1.3 AlertsPage – Alerts stored only in memory
- **File:** `frontend/src/pages/AlertsPage.jsx`
- **Issue:** Alerts use `useState(INITIAL_ALERTS)`. Create/Edit/Delete actions affect local state only. No backend API; alerts are lost on refresh.
- **Impact:** Alerts are not persisted; UX suggests persistence but behavior is ephemeral.
- **Fix:** Implement `/api/alerts` (CRUD) and persist alerts in MongoDB or another store.

---

## 2. Hardcoded Values → Environment Variables

### 2.1 Backend – JWT secret fallback
- **Files:** `backend/src/routes/auth.js` (line 7), `backend/src/middleware/auth.js` (line 12)
- **Issue:** `process.env.JWT_SECRET || 'logtrace_super_secret_key_2024'` – hardcoded fallback secret.
- **Fix:** Remove fallback in production. In dev, use a clear default or fail fast:
  ```js
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) throw new Error('JWT_SECRET must be set')
  ```

### 2.2 Backend – MongoDB default
- **File:** `backend/src/index.js` (line 43)
- **Issue:** `process.env.MONGODB_URI || 'mongodb://localhost:27017/logtrace'`
- **Status:** Reasonable default for local dev; ensure `MONGODB_URI` is set in production.

### 2.3 Backend – Elasticsearch default
- **File:** `backend/src/elasticsearch.js` (line 4)
- **Issue:** `process.env.ELASTICSEARCH_URL || 'http://localhost:9200'`
- **Status:** Acceptable for local dev; ensure `ELASTICSEARCH_URL` is set in production.

### 2.4 Backend – Retention job
- **File:** `backend/src/jobs/retentionJob.js`
- **Issue:** `RETENTION_DAYS` and `RETENTION_CRON` use env vars with defaults; this is appropriate.

### 2.5 Frontend – API base URL
- **File:** `frontend/src/config.js`
- **Status:** Uses `VITE_API_URL` with `http://localhost:3001/api` as dev default; good.

### 2.6 Frontend – Service list and constants
- **Files:** Multiple (e.g. `AlertsPage.jsx`, `LogsPage.jsx`, `SettingsPage.jsx`, `backend/routes/*.js`)
- **Issue:** Service names (auth-service, payment-service, etc.) are hardcoded in many places.
- **Impact:** Centralize in a shared constant or config so changes are made in one place.

---

## 3. Console.log Statements (Production Cleanup)

| File | Line | Content |
|------|------|---------|
| `backend/src/index.js` | 42 | `console.log(\`LogTrace backend running on port ${PORT}\`)` |
| `backend/src/index.js` | 46 | `console.log('MongoDB connected')` |
| `backend/src/index.js` | 48 | `console.error('Failed to connect to MongoDB:', err.message)` |
| `backend/src/index.js` | 53 | `console.log('[Simulator] Off by default...')` |
| `backend/src/index.js` | 55 | `console.error('Failed to initialize Elasticsearch:', err.message)` |
| `backend/src/simulator.js` | 121, 124, 154, 157, 167, 170, 189 | Simulator status/error logs |
| `backend/src/jobs/retentionJob.js` | 22, 26, 32 | Retention job logs |

**Recommendation:**  
- Keep `console.error` for startup/connection failures.  
- Replace `console.log` in production with a logger (e.g. `winston` or `pino`) and log level control.  
- Or wrap in `if (process.env.NODE_ENV !== 'production')` where appropriate.

---

## 4. Missing Error Handling on API Calls

### 4.1 AuthContext – No try/catch
- **File:** `frontend/src/context/AuthContext.jsx` (lines 36–51)
- **Issue:** `login()` and `register()` have no try/catch. Errors propagate to callers (e.g. LoginPage/SignupPage).
- **Status:** Callers handle errors and show them to the user; AuthContext could still add a wrapper for consistency and logging.

### 4.2 API calls – Error handling overview
- **DashboardPage:** Has try/catch and `setError`.
- **LogsPage:** Has try/catch and `setError`.
- **ServicesPage:** Has try/catch and `setError`.
- **AlertsPage:** `fetchServices` catches errors but sets `setPaymentErrorRate(47)` on error – suspicious fallback.
- **SettingsPage:** Has try/catch with clear error handling.

### 4.3 AlertsPage – Odd error fallback
- **File:** `frontend/src/pages/AlertsPage.jsx` (line 37)
- **Issue:** `catch { setPaymentErrorRate(47) }` – hardcoded value used when API fails.
- **Fix:** On error, keep the previous rate or set a neutral/unknown state instead of 47.

---

## 5. UI Inconsistencies Between Pages

| Aspect | Dashboard | Logs | Services | Alerts | Settings |
|--------|-----------|------|----------|--------|----------|
| Page title style | Implicit | Implicit | `h1.services-title` | `h1.text-2xl` | `h1.text-2xl` |
| Error banner style | `.dashboard-error-banner` | Tailwind classes | Tailwind classes | (none) | `.settings-error` |
| Loading spinner | `.dashboard-spinner` | “Loading...” in table | `.services-spinner` | (none) | (none) |
| Empty state | “No logs yet” | “No logs found” | Fallback to 5 services | N/A | N/A |

**Recommendations:**
1. Use a shared error banner component and styling.
2. Use a shared loading component for consistency.
3. Standardize page titles (e.g. one shared layout component).

---

## 6. Security Issues

### 6.1 No auth guards on protected API routes
- **Severity:** High  
- **Issue:** `/api/logs`, `/api/dashboard/*`, `/api/services`, `/api/retention`, `/api/simulator` have no authentication middleware. Anyone with the API URL can access logs and services without logging in.
- **Evidence:** `backend/src/index.js` – routes are mounted without `authMiddleware`.
- **Fix:** Apply `authMiddleware` to all routes except `/api/auth/*` and `/health`, and ensure the frontend sends the JWT.

### 6.2 Frontend – API calls without Bearer token
- **Severity:** High  
- **Issue:** Axios calls do not add `Authorization: Bearer <token>`.
- **Evidence:** No axios interceptor or per-request config that adds the token.
- **Fix:** Add an axios interceptor (or similar) that attaches `Authorization: Bearer ${token}` when a token exists.

### 6.3 Exposed JWT secret fallback
- **Severity:** High (if deployed without `JWT_SECRET`)  
- **Issue:** `'logtrace_super_secret_key_2024'` is used when `JWT_SECRET` is unset.
- **Fix:** Do not use a default in production; require `JWT_SECRET` and fail fast if missing.

### 6.4 CORS
- **File:** `backend/src/index.js` (line 17)
- **Issue:** `app.use(cors())` with no origin restriction allows all origins.
- **Fix:** In production, restrict to known frontend origins: `cors({ origin: process.env.FRONTEND_URL })`.

---

## 7. Missing Loading States or Empty States

| Page | Loading state | Empty state |
|------|----------------|-------------|
| Dashboard | Yes (spinner) | Yes (“No logs yet”) |
| Logs | Yes (“Loading...” in table) | Yes (“No logs found”) |
| Services | Yes (spinner) | Fallback to 5 empty services |
| Alerts | No | N/A (always has initial alerts) |
| Settings | Partial (button states only) | N/A |

**Recommendations:**
1. **AlertsPage:** Add loading state when `fetchServices` runs.
2. **SettingsPage:** Add loading state for initial `fetchTotalLogs` / `fetchPolicies` / `fetchSimulatorStatus`.

---

## 8. TODO Comments

- No `TODO`, `FIXME`, or `HACK` comments found in the codebase.

---

## Summary Table

| Category | Count | Severity |
|----------|-------|----------|
| Broken/incomplete features | 3 | Medium–High |
| Hardcoded secrets | 2 | High |
| Console statements | 11+ | Low |
| Missing/inconsistent error handling | 2 | Low |
| UI inconsistencies | 4+ | Low |
| Security issues | 4 | High |
| Missing loading/empty states | 2 | Low |

---

## Recommended Priority Order

1. **P0 – Security:** Add auth middleware to protected API routes; attach Bearer token on frontend API calls; remove JWT secret fallback in production.
2. **P1 – Broken features:** Fix `#areaGlow` filter or remove it; fix stack trace handling in LogsPage; add backend persistence for Alerts.
3. **P2 – Hardcoded values:** Ensure all production config is via env vars; centralize service names.
4. **P3 – Logging:** Replace `console.log` with a proper logger for production.
5. **P4 – UX:** Unify error banners, loading states, and page structure across pages.
