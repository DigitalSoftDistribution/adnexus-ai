import express from 'express';
import request from 'supertest';
import { createAuthRoutes } from '../../src/interface/http/routes/auth';
import { expressErrorHandler } from '../../src/interface/http/middleware/errorHandler';

describe('v2 auth proxy', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/auth', createAuthRoutes());
  app.use(expressErrorHandler);

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps signin proxy failures to controlled invalid-credentials response', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('v1 unavailable')) as unknown as typeof fetch;

    const response = await request(app)
      .post('/api/v2/auth/signin')
      .send({ email: 'bad@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
    });
  });
});
