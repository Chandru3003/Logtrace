# LogTrace Test Execution Guide

## Running Tests

### Frontend (Vitest)
```bash
cd frontend
npm test          # Run once
npm run test:watch  # Watch mode
```

### Backend (Jest)
```bash
cd backend
npm test
```
**Note:** Auth integration tests require MongoDB. Start Docker first: `docker compose up -d`

### Manual Testing
Use the test cases in `TEST_PLAN.md`. Execute each section and mark results in the Test Execution Log.

---

## Pre-Deployment Checklist

- [ ] `cd frontend && npm run build` succeeds
- [ ] `cd frontend && npm test` passes
- [ ] `cd backend && npm test` passes (with MongoDB)
- [ ] `.env` is in `.gitignore` and not committed
- [ ] `VITE_API_URL` or equivalent set for production builds
