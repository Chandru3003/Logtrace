# LogTrace – Automated Tests Documentation

This document describes all automated test cases for the LogTrace application and confirms that they have passed.

---

## Frontend Tests (Vitest + React Testing Library)

**Location:** `frontend/src/pages/`  
**Run command:** `npm test` (from `frontend` directory)

### LoginPage (5 tests)

| Test Case | Description | Status |
|-----------|-------------|--------|
| **renders login form with email and password fields** | Verifies the login page displays email input, password input, and Sign In button. | ✓ Passed |
| **shows error when submitting empty form** | When user clicks Sign In without entering credentials, the message "Please enter email and password" appears and login is not called. | ✓ Passed |
| **calls login with email and password when form is valid** | Entering valid email and password and clicking Sign In invokes `login` with the correct arguments. | ✓ Passed |
| **displays error when login fails** | When the API returns an error (e.g. invalid credentials), the error message is shown on the page. | ✓ Passed |
| **has link to signup page** | The page includes a link to `/signup` for new users. | ✓ Passed |

### SignupPage (6 tests)

| Test Case | Description | Status |
|-----------|-------------|--------|
| **renders signup form with all fields** | Verifies the signup page displays name, email, password, confirm password fields and Create Account button. | ✓ Passed |
| **shows error when name is empty** | Submitting without a name shows "Name is required" and register is not called. | ✓ Passed |
| **shows error when passwords do not match** | Mismatched password and confirm password shows "Passwords do not match" and register is not called. | ✓ Passed |
| **shows error when password is too short** | Password under 6 characters shows "Password must be at least 6 characters" and register is not called. | ✓ Passed |
| **calls register with valid data** | Filling all fields correctly and submitting calls `register` with name, email, and password. | ✓ Passed |
| **has link to login page** | The page includes a link to `/login` for existing users. | ✓ Passed |

---

## Backend Tests (Jest + Supertest)

**Location:** `backend/auth.test.js`  
**Run command:** `npm test` (from `backend` directory)

### Auth API (7 tests)

#### POST /api/auth/register

| Test Case | Description | Status |
|-----------|-------------|--------|
| **returns 400 when email is missing** | Sending `{ name, password }` without email returns 400 and an error about email being required. | ✓ Passed |
| **returns 400 when password is missing** | Sending `{ name, email }` without password returns 400 and an error about password being required. | ✓ Passed |
| **returns 400 when password is too short** | Password shorter than 6 characters returns 400 with a validation error. | ✓ Passed |
| **returns 201 and token when registration succeeds** | Valid `{ name, email, password }` returns 201, a JWT token, and user object. | ✓ Passed |

#### POST /api/auth/login

| Test Case | Description | Status |
|-----------|-------------|--------|
| **returns 400 when email is missing** | Login without email returns 400 and an error. | ✓ Passed |
| **returns 400 when password is missing** | Login without password returns 400 and an error. | ✓ Passed |
| **returns 401 for invalid credentials** | Wrong email/password returns 401 with an invalid credentials message. | ✓ Passed |

---

## Test Run Output

### Frontend

```
> frontend@0.0.0 test
> vitest run

 RUN  v4.0.18 C:/Users/Carrot/OneDrive - UT Arlington/ProjectsGRAD/logtrace/frontend

 ✓ src/pages/LoginPage.test.jsx (5 tests) 6713ms
     ✓ renders login form with email and password fields  1750ms
     ✓ shows error when submitting empty form  724ms
     ✓ calls login with email and password when form is valid  2099ms
     ✓ displays error when login fails  1843ms
 ✓ src/pages/SignupPage.test.jsx (6 tests) 15991ms
     ✓ renders signup form with all fields  1807ms
     ✓ shows error when name is empty  3103ms
     ✓ shows error when passwords do not match  4033ms
     ✓ shows error when password is too short  3470ms
     ✓ calls register with valid data  3400ms
     ✓ has link to login page

 Test Files  2 passed (2)
      Tests  11 passed (11)
   Duration  ~20s
```

### Backend

```
> logtrace-backend@1.0.0 test
> jest

PASS ./auth.test.js (5.653 s)
  Auth API
    POST /api/auth/register
      √ returns 400 when email is missing (169 ms)
      √ returns 400 when password is missing (30 ms)
      √ returns 400 when password is too short (13 ms)
      √ returns 201 and token when registration succeeds (361 ms)
    POST /api/auth/login
      √ returns 400 when email is missing (14 ms)
      √ returns 400 when password is missing (12 ms)
      √ returns 401 for invalid credentials (27 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Time:        5.992 s
Ran all test suites.
```

---

## Summary

| Suite | Tests | Status |
|-------|-------|--------|
| Frontend (LoginPage + SignupPage) | 11 | All passed |
| Backend (Auth API) | 7 | All passed |
| **Total** | **18** | **All passed** |
