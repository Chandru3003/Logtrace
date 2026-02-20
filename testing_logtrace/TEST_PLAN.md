# LogTrace – Test Plan

**Version:** 1.0  
**Date:** February 2025  
**Project:** LogTrace – Centralized Log Monitoring

---

## 1. Scope

This document defines all manual and automated test cases for the LogTrace application. Tests cover functional, integration, security, and deployment readiness.

---

## 2. Prerequisites for Testing

- Docker (Elasticsearch + MongoDB)
- Node.js 18+
- Backend: `cd backend && npm start` (port 3001)
- Frontend: `cd frontend && npm run dev` (port 5173)
- Demo logs: Enable in Settings → Demo Logs (for Logs/Dashboard data)

---

## 3. Test Cases

### 3.1 Authentication

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-01 | Login with valid credentials | 1. Go to /login<br>2. Enter valid email & password<br>3. Click Sign In | Redirect to /dashboard, user menu shows name | P0 |
| AUTH-02 | Login with invalid email | 1. Go to /login<br>2. Enter unknown email + any password | Error: "Invalid email or password" | P0 |
| AUTH-03 | Login with wrong password | 1. Use registered email, wrong password | Error: "Invalid email or password" | P0 |
| AUTH-04 | Login with empty fields | 1. Leave email or password blank | Error: "Please enter email and password" | P1 |
| AUTH-05 | Sign up with valid data | 1. Go to /signup<br>2. Enter name, email, password, confirm password<br>3. Click Create Account | Account created, redirect to /dashboard | P0 |
| AUTH-06 | Sign up with duplicate email | 1. Use already registered email | Error: "Email already registered" | P0 |
| AUTH-07 | Sign up with short password | 1. Enter password < 6 chars | Error: "Password must be at least 6 characters" | P1 |
| AUTH-08 | Sign up with mismatched passwords | 1. Password ≠ confirm password | Error: "Passwords do not match" | P1 |
| AUTH-09 | Sign up missing name/email | 1. Leave name or email empty | Appropriate error shown | P1 |
| AUTH-10 | Logout | 1. Click user menu → Sign out | Redirect to /login, token cleared | P0 |
| AUTH-11 | Protected route redirect | 1. Log out, visit /dashboard directly | Redirect to /login | P0 |
| AUTH-12 | Login redirect after auth | 1. Visit /login while logged in | Redirect to /dashboard | P1 |

---

### 3.2 Dashboard

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| DASH-01 | Dashboard loads | 1. Log in, go to Dashboard | Stats cards, charts, log table visible | P0 |
| DASH-02 | Stats display | 1. View total logs, error rate, services | Numbers load (0 if no data) | P0 |
| DASH-03 | Volume chart | 1. View log volume chart | Chart renders without error | P1 |
| DASH-04 | Service distribution | 1. View services chart | Chart or empty state shown | P1 |
| DASH-05 | Recent logs table | 1. View recent logs | Table or "No logs" message | P1 |
| DASH-06 | Nav to Logs from Dashboard | 1. Click Logs in sidebar | Navigate to /logs | P1 |

---

### 3.3 Logs Page

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| LOG-01 | Logs page loads | 1. Go to Logs | Page loads, search/filters visible | P0 |
| LOG-02 | Search logs | 1. Enter search term in query box | Logs filtered by message content | P1 |
| LOG-03 | Filter by level | 1. Select level (ERROR, WARN, etc.) | Results filtered by level | P1 |
| LOG-04 | Filter by service | 1. Select service | Results filtered by service | P1 |
| LOG-05 | Time range filter | 1. Select 15m, 1h, 6h, 24h | Results filtered by time | P1 |
| LOG-06 | Empty state | 1. Use filters with no matches | "No logs" or empty list | P2 |
| LOG-07 | Pagination | 1. If > 50 logs, scroll/load more | More logs load | P2 |

---

### 3.4 Services Page

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SVC-01 | Services page loads | 1. Go to Services | List of 5 services visible | P0 |
| SVC-02 | Service stats | 1. View each service card | Log count, error rate, avg duration shown | P1 |
| SVC-03 | Volume chart per service | 1. View service volume chart | Chart renders | P2 |
| SVC-04 | Last seen timestamp | 1. With demo logs on | Last seen shows time or "Never" | P2 |

---

### 3.5 Alerts Page

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ALT-01 | Alerts page loads | 1. Go to Alerts | Default alerts list visible | P0 |
| ALT-02 | Create alert | 1. Click Add Alert<br>2. Fill name, service, metric, threshold<br>3. Save | New alert appears in list | P1 |
| ALT-03 | Create alert validation | 1. Submit empty or invalid form | Error message, no alert created | P1 |
| ALT-04 | Edit alert | 1. Click Edit on an alert<br>2. Change values<br>3. Save | Alert updated | P1 |
| ALT-05 | Delete alert | 1. Click Delete on an alert | Alert removed | P1 |
| ALT-06 | Mark Resolved | 1. Click Mark Resolved on triggered alert | Status changes to RESOLVED | P1 |
| ALT-07 | Reactivate | 1. Click Reactivate on resolved alert | Status changes to ACTIVE | P2 |
| ALT-08 | Cancel edit | 1. Edit alert, click Cancel | Changes discarded | P2 |

---

### 3.6 Settings Page

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SET-01 | Settings loads | 1. Go to Settings | Storage, Retention, Cleanup sections visible | P0 |
| SET-02 | Storage overview | 1. View total logs, estimated size | Numbers displayed | P1 |
| SET-03 | Demo Logs toggle OFF→ON | 1. Turn Demo Logs ON | Toggle on, logs start generating | P0 |
| SET-04 | Demo Logs toggle ON→OFF | 1. Turn Demo Logs OFF | Toggle off, logs stop | P1 |
| SET-05 | Retention policy change | 1. Change retention days per service<br>2. Save | Success message, policies updated | P1 |
| SET-06 | Run Cleanup | 1. Click Run Cleanup Now | Deleted count, bytes saved shown | P1 |
| SET-07 | Retention policy validation | 1. Set invalid value (e.g. 5 days) | Rejected or clamped to 7–90 | P2 |

---

### 3.7 Navigation & Layout

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NAV-01 | Sidebar links | 1. Click each nav item | Correct page loads | P0 |
| NAV-02 | Responsive layout | 1. Resize to mobile width | Layout adapts, nav usable | P1 |
| NAV-03 | 404 / unknown route | 1. Visit /unknown-path | Redirect to dashboard or login | P2 |

---

### 3.8 API & Backend

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| API-01 | Health check | GET /health | 200, { status: 'ok', elasticsearch: true } | P0 |
| API-02 | Register | POST /api/auth/register with valid body | 201, token + user | P0 |
| API-03 | Login | POST /api/auth/login with valid body | 200, token + user | P0 |
| API-04 | Logs list | GET /api/logs | 200, { total, hits } | P0 |
| API-05 | Dashboard stats | GET /api/dashboard/stats | 200, stats object | P0 |
| API-06 | Services | GET /api/services | 200, { services } | P0 |
| API-07 | Simulator status | GET /api/simulator/status | 200, { enabled } | P1 |
| API-08 | Simulator enable | POST /api/simulator/enable | 200, { enabled: true } | P1 |
| API-09 | Retention policies | GET /api/retention | 200, { policies } | P1 |
| API-10 | Retention save | POST /api/retention with policies | 200, updated policies | P1 |

---

### 3.9 Security & Validation

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SEC-01 | JWT required for protected API | Call /api/logs without token | 200 (currently no auth middleware on logs) or intended behavior | P2 |
| SEC-02 | XSS in form input | Enter `<script>alert(1)</script>` in name | Escaped, no script execution | P2 |
| SEC-03 | SQL/NoSQL injection | Malicious input in search | Handled safely by ES | P2 |

---

### 3.10 Deployment Readiness

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| DEP-01 | Frontend build | `cd frontend && npm run build` | Build succeeds | P0 |
| DEP-02 | No hardcoded localhost in prod | Check API_BASE usage | Use env variable for production | P1 |
| DEP-03 | .env.example present | Check backend | .env.example documents required vars | P1 |
| DEP-04 | .gitignore excludes .env | Check .gitignore | .env not committed | P0 |

---

## 4. Test Execution Log

| Date | Tester | Environment | Result | Notes |
|------|--------|-------------|--------|-------|
| | | | | |

---

## 5. Known Limitations

- Alerts are in-memory only (not persisted across page refresh)
- Backend requires MongoDB + Elasticsearch; Vercel hosts frontend only; backend needs separate deployment (Railway, Render, etc.)
- No forgot-password flow

---

## 6. Sign-Off

- [ ] All P0 tests passed
- [ ] All P1 tests passed
- [ ] Frontend build succeeds
- [ ] Ready for GitHub push
- [ ] Ready for Vercel deployment (frontend)
