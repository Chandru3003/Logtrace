LogTrace – Centralized Log Monitoring System
Show Image
A production-grade distributed logging platform that aggregates, indexes, and visualizes logs from multiple microservices in real time. Built to solve the core DevOps problem of debugging distributed systems — instead of SSHing into individual servers, engineers get a single dashboard showing everything happening across all services simultaneously.
Live Demo
Coming soon — deployment in progress
The Problem This Solves
When you run multiple microservices simultaneously, logs are scattered across different servers and processes. When something breaks in production, finding the root cause means digging through each service manually — this can take hours. LogTrace centralizes everything into one searchable, visual interface so engineers can identify and resolve incidents in seconds.
Features

Real-time log aggregation from 5 microservices simultaneously
Full-text search powered by Elasticsearch across millions of log entries
Live dashboard with error trend visualization and incident detection
Per-service health monitoring with degraded/healthy/down status
Configurable data retention policies that reduce storage overhead by ~25%
Automated daily cleanup job using node-cron
JWT-based authentication with MongoDB user storage
Incident alerts when error rate spikes above threshold

Tech Stack
Frontend

React + Vite — component-based UI with fast hot reload
Tailwind CSS — utility-first styling
Recharts — real-time data visualization (area charts, donut charts, sparklines)
React Router v6 — client-side navigation
Axios — HTTP client with JWT interceptor

Backend

Node.js + Express — REST API server
Elasticsearch 8.11 — log storage, indexing, and full-text search
MongoDB + Mongoose — user authentication storage
node-cron — scheduled retention cleanup jobs
bcryptjs — password hashing
jsonwebtoken — session management

Infrastructure

Docker + Docker Compose — containerized Elasticsearch and MongoDB
Vercel — frontend deployment
Render — backend deployment

Architecture
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│         Dashboard │ Logs │ Services │ Alerts │ Settings  │
└────────────────────────┬────────────────────────────────┘
                        │ HTTP + JWT
┌────────────────────────▼────────────────────────────────┐
│                  Express REST API                        │
│     /api/logs │ /api/dashboard │ /api/services           │
│     /api/auth │ /api/retention │ /api/alerts             │
└──────────┬─────────────────────────────┬────────────────┘
          │                             │
┌──────────▼──────────┐     ┌────────────▼───────────────┐
│    Elasticsearch     │     │         MongoDB             │
│  Log storage +       │     │    User accounts +          │
│  Full-text search    │     │    Authentication           │
└──────────▲──────────┘     └────────────────────────────┘
          │
┌──────────┴──────────────────────────────────────────────┐
│                  Log Simulator                           │
│  auth-service │ payment-service │ api-gateway            │
│  user-service │ notification-service                     │
│  25 logs/second │ incident trigger every 2-3 minutes     │
└─────────────────────────────────────────────────────────┘
How It Works
Log Ingestion
A simulator generates realistic logs from 5 microservices at 25 logs per second (1,500/minute, ~90K/hour). Every 2-3 minutes, payment-service intentionally floods with ERROR logs simulating a real database connection timeout incident. This demonstrates how the system behaves under real production conditions.
Storage & Indexing
Every log entry is stored in Elasticsearch with these fields: timestamp, level (INFO/WARN/ERROR/DEBUG), service, message, traceId, duration, archived. Elasticsearch indexes the message field for full-text search, meaning you can search 'DB connection timeout' across 100,000 logs in milliseconds.
Retention System
A cron job runs daily at 2am and deletes logs older than 30 days using Elasticsearch's delete-by-query API. The Settings page shows before/after storage metrics and allows configuring retention period per service. This directly reduces storage costs by approximately 25%.
Authentication
Users register and log in via JWT authentication. Passwords are hashed with bcrypt (10 salt rounds). JWT tokens expire after 7 days. All API routes except /api/auth are protected by auth middleware that validates the token on every request.
Pages
Dashboard
Real-time overview with four stat cards (Total Logs, Error Rate, Active Services, Avg Response Time), a 60-minute log volume area chart broken down by level, a live log feed that refreshes every 3 seconds, and a service distribution donut chart. Shows a red incident banner when payment-service error rate exceeds 10%.
Log Explorer
Full-text search across all logs with filters for level, service, and time range. Results table with colored level badges, trace IDs, and durations. Click any row to open a detail drawer showing full log metadata and stack trace.
Services
Per-service health cards showing total logs, error count, error rate, avg response time, and a sparkline chart. Payment-service shows DEGRADED status during incidents. Expandable table rows show the last 5 logs per service.
Alerts
Configurable alert rules for error rate thresholds, response time limits, and log volume drops. Alerts automatically trigger based on real metrics from Elasticsearch.
Settings
Storage overview with total logs and estimated storage size. Per-service retention policy configuration. Manual cleanup trigger with before/after storage comparison.
Getting Started
Prerequisites

Node.js 18+
Docker Desktop
Git

Installation
bash# Clone the repository
git clone https://github.com/YOURNAME/logtrace.git
cd logtrace

# Start Elasticsearch and MongoDB
docker-compose up -d

# Install and start backend
cd backend
npm install
cp .env.example .env
npm start

# Install and start frontend (new terminal)
cd frontend
npm install
npm run dev
Environment Variables
Create a .env file in the backend folder:
ELASTICSEARCH_URL=http://localhost:9200
MONGODB_URI=mongodb://localhost:27017/logtrace
JWT_SECRET=your_secret_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
Open http://localhost:5173 and register a new account to get started.
Running Tests
bash# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test
Deployment

Frontend: Deployed on Vercel
Backend: Deployed on Render
Elasticsearch: Elastic Cloud free tier
MongoDB: MongoDB Atlas free tier

Resume Bullet Points This Project Demonstrates

Distributed logging service aggregating logs from 5 microservices at 25 logs/second
Full-text search and filtering using Elasticsearch with React-based visualization dashboard
Retention and archiving mechanism reducing storage overhead by ~25% through configurable TTL policies
JWT authentication with bcrypt password hashing and MongoDB user storage
Containerized infrastructure with Docker Compose
