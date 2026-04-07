/**
 * Integration tests for the Express HTTP API.
 * Uses supertest to hit routes without mocking the network layer.
 * DB calls are mocked to keep tests fast and hermetic.
 */
'use strict';

process.env.NODE_ENV = 'test';
process.env.APP_MODE = 'api';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/stixmagic_test';

const request = require('supertest');
const { createApp } = require('../api/app');

// Mock Prisma client so we don't need a real database.
// Using var so the declaration is hoisted, matching jest.mock hoisting.
// eslint-disable-next-line no-var
var mockDb;
// eslint-disable-next-line no-var
var mockDependencies;

vi.mock('../database/client', () => {
  mockDb = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
    },
    apiKey: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    integrationToken: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn().mockResolvedValue([[], 0]),
    $on: vi.fn(),
  };
  return { getPrismaClient: () => mockDb };
});

vi.mock('../core/dependencies', () => {
  mockDependencies = {
    refreshDependencyState: vi.fn().mockResolvedValue(undefined),
    getDependencyState: vi.fn().mockReturnValue({ db: { ready: true }, redis: { ready: true } }),
    isReady: vi.fn().mockReturnValue(true),
  };
  return mockDependencies;
});

const app = createApp();

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.mode).toBe('api');
  });
});

describe('GET /health/ready', () => {
  it('returns 200 with status ready when dependencies are ready', async () => {
    mockDependencies.isReady.mockReturnValueOnce(true);

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('returns 503 with status not_ready when dependencies are unavailable', async () => {
    mockDependencies.isReady.mockReturnValueOnce(false);

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
  });
});

describe('POST /auth/register', () => {
  it('returns 409 when email already exists', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'existing@example.com', username: 'alice', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', username: 'alice', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', username: 'alice', password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns 401 when user not found', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

describe('Unauthenticated protected routes', () => {
  it('GET /users returns 401 without token', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });

  it('POST /content returns 401 without token', async () => {
    const res = await request(app).post('/content').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });

  it('GET /integrations returns 401 without token', async () => {
    const res = await request(app).get('/integrations');
    expect(res.status).toBe(401);
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unregistered path', async () => {
    const res = await request(app).get('/nonexistent-path');
    expect(res.status).toBe(404);
  });
});
