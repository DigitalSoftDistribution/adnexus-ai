import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import {
  setupTestDB, teardownTestDB, cleanupTables, createTestUser, createTestWorkspace,
  addUserToWorkspace, buildE2EMockFrom, buildE2EAuthMock,
} from './setup';

const mockFrom = jest.fn();
let mockAuth: any = null;
const authProxy = new Proxy({}, { get(_t, p: string) { if (!mockAuth) mockAuth = buildE2EAuthMock(); return (mockAuth as any)[p]; } });
jest.mock('../../src/lib/supabase', () => ({ supabase: { from: (...a: unknown[]) => mockFrom(...a), rpc: jest.fn().mockResolvedValue({ data: null, error: null }), get auth() { return authProxy; } } }));

describe('dbg', () => {
  beforeAll(async () => { await setupTestDB(); mockFrom.mockImplementation(buildE2EMockFrom()); mockAuth = buildE2EAuthMock(); });
  afterAll(async () => { await teardownTestDB(); });
  beforeEach(async () => { await cleanupTables(['all']); jest.clearAllMocks(); mockFrom.mockImplementation(buildE2EMockFrom()); mockAuth = buildE2EAuthMock(); });

  it('signin debug', async () => {
    const owner = await createTestUser({ email: 'signin-test@example.com', password: 'CorrectPass123!', name: 'Signin Test User' });
    const ws = await createTestWorkspace({ ownerId: owner.id });
    await addUserToWorkspace(owner.id, ws.id, 'owner');
    mockFrom.mockImplementation(buildE2EMockFrom());
    const res = await request(app).post('/api/v1/auth/signin').send({ email: 'signin-test@example.com', password: 'CorrectPass123!' });
    console.error('CRITICAL SIGNIN', res.status, JSON.stringify(res.body));
    expect(true).toBe(true);
  });
});
