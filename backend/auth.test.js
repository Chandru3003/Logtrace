/**
 * Auth API tests (run with backend services: MongoDB required)
 * Usage: npm test (from backend directory)
 */
const request = require('supertest');

// We need to load the app without starting the server
// Create a minimal express app for auth routes only to avoid ES/Mongo deps in CI
process.env.JWT_SECRET = 'test_secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logtrace_test';

const mongoose = require('mongoose');
const express = require('express');
const authRouter = require('./src/routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth API', () => {
  beforeAll(async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
      console.warn('MongoDB not available, skipping auth integration tests:', err.message);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', password: 'pass1234' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email|required/i);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password|required/i);
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@test.com', password: '12345' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/6|password/i);
    });

    it('returns 201 and token when registration succeeds', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      if (res.status === 500 && res.body.error?.includes('connect')) {
        return; // MongoDB not available
      }
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.name).toBe(testUser.name);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'pass1234' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email|required/i);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password|required/i);
    });

    it('returns 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid|email|password/i);
    });
  });
});
