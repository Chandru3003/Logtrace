# LogTrace

Log monitoring dashboard with Elasticsearch, MongoDB auth, and retention policies.

## Quick Start

1. **Start services**
   ```bash
   docker-compose up -d
   ```

2. **Backend**
   ```bash
   cd backend
   cp .env.example .env   # edit if needed
   npm start
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

4. Open http://localhost:5173 — sign up or log in.

## Demo Logs

New users see an empty dashboard. Go to **Settings** and turn on **Demo Logs** to generate sample logs from 5 mock services.
