import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/index';
import { mockUsers, mockWorkspaces, mockWorkspaceMembers, UUIDS, mockPasswords } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();

// Supabase Auth (auth.admin.* + top-level auth.*) — the auth route delegates
// account creation, sign-in, and password operations to Supabase Auth rather
// than hashing passwords in the database. Each method is a jest.fn() so tests
// can override behaviour per case; sensible defaults are (re)installed in
// resetAuthMock() which runs in every beforeEach.
const mockAuth = {
  admin: {
    listUsers: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    updateUserById: jest.fn(),
    getUserById: jest.fn(),
  },
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  getUser: jest.fn(),
  signOut: jest.fn(),
};

/** Install default Supabase Auth behaviour (no existing users, happy-path). */
function resetAuthMock() {
  mockAuth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  mockAuth.admin.createUser.mockResolvedValue({
    data: { user: { id: UUIDS.owner, email: mockUsers.owner.email } },
    error: null,
  });
  mockAuth.admin.deleteUser.mockResolvedValue({ data: null, error: null });
  mockAuth.admin.updateUserById.mockResolvedValue({ data: { user: { id: UUIDS.owner } }, error: null });
  mockAuth.admin.getUserById.mockResolvedValue({ data: { user: { id: UUIDS.owner } }, error: null });
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: { id: UUIDS.owner, email: mockUsers.owner.email } },
    error: null,
  });
  mockAuth.signUp.mockResolvedValue({ data: { user: { id: UUIDS.owner } }, error: null });
  mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mockAuth.signOut.mockResolvedValue({ error: null });
}

/**
 * Default chainable query-builder returned by from() for any table a test does
 * not explicitly configure. Every method returns `this` so arbitrary chains
 * resolve, and the terminal operations resolve to an empty/no-op result.
 */
function defaultBuilder() {
  const builder: Record<string, unknown> = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((cb: (r: unknown) => unknown) => Promise.resolve(cb({ data: null, error: null }))),
  };
  return builder;
}

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: mockAuth,
  },
}));

// ─── Suite: POST /auth/signup ────────────────────────────────────

describe('POST /api/v1/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMock();
    mockFrom.mockImplementation(() => defaultBuilder());
  });

  it('should create a new user with workspace', async () => {
    // Arrange
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: mockInsert.mockImplementation((data: unknown) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockUsers.owner, error: null }),
          })),
        };
      }
      if (table === 'workspaces') {
        return {
          insert: mockInsert.mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockWorkspaces.free, error: null }),
          })),
        };
      }
      if (table === 'workspace_members') {
        return {
          insert: mockInsert.mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockWorkspaceMembers[0], error: null }),
          })),
        };
      }
      if (table === 'auth_passwords') {
        return {
          insert: mockInsert.mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      if (table === 'ai_credits') {
        return {
          insert: mockInsert.mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      return defaultBuilder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user).toBeDefined();
  });

  it('should reject signup with invalid email', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'SecurePass123!',
        name: 'Test User',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject signup with short password', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject signup with missing name', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject when email already exists', async () => {
    // Arrange — the route checks Supabase Auth (listUsers) for an existing
    // email, so the duplicate must be surfaced there rather than via from().
    mockAuth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: UUIDS.owner, email: 'owner@example.com' }] },
      error: null,
    });
    mockFrom.mockImplementation(() => defaultBuilder());

    // Act
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'owner@example.com',
        password: 'SecurePass123!',
        name: 'Duplicate User',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
  });
});

// ─── Suite: POST /auth/signin ────────────────────────────────────

describe('POST /api/v1/auth/signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMock();
    mockFrom.mockImplementation(() => defaultBuilder());
  });

  it('should sign in with valid credentials', async () => {
    // Arrange
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUsers.owner, error: null }),
        };
      }
      if (table === 'auth_passwords') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { password_hash: bcrypt.hashSync('CorrectPass123!', 12) },
            error: null,
          }),
        };
      }
      if (table === 'workspace_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWorkspaceMembers[0], error: null }),
        };
      }
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWorkspaces.free, error: null }),
        };
      }
      if (table === 'audit_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return defaultBuilder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/signin')
      .send({
        email: 'owner@example.com',
        password: 'CorrectPass123!',
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.workspace).toBeDefined();
  });

  it('should reject sign in with invalid password', async () => {
    // Arrange — Supabase Auth rejects the credentials, which the route maps
    // to a 401. (Password verification is delegated to Supabase, not bcrypt.)
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    mockFrom.mockImplementation(() => defaultBuilder());

    // Act
    const response = await request(app)
      .post('/api/v1/auth/signin')
      .send({
        email: 'owner@example.com',
        password: 'WrongPassword!',
      });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject sign in for non-existent user', async () => {
    // Arrange
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return defaultBuilder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/signin')
      .send({
        email: 'nonexistent@example.com',
        password: 'SomePass123!',
      });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject sign in with invalid email format', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/auth/signin')
      .send({
        email: 'not-an-email',
        password: 'password123',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /auth/forgot-password ───────────────────────────

// The password-reset endpoint is mounted at POST /auth/reset-password (it
// requests a reset email). It looks the user up via Supabase Auth listUsers()
// and always returns the same privacy-preserving message.
describe('POST /api/v1/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMock();
    mockFrom.mockImplementation(() => defaultBuilder());
  });

  it('should initiate password reset for existing user', async () => {
    // Arrange — user exists in Supabase Auth
    mockAuth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: UUIDS.owner, email: 'owner@example.com' }] },
      error: null,
    });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ email: 'owner@example.com' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toContain('reset');
  });

  it('should return success even for non-existent email (privacy)', async () => {
    // Arrange — no matching user in Supabase Auth
    mockAuth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ email: 'nobody@example.com' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Should not reveal whether email exists
    expect(response.body.data.message).toContain('reset');
  });

  it('should reject invalid email format', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ email: 'not-an-email' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: GET /auth/me ─────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMock();
    mockFrom.mockImplementation(() => defaultBuilder());
  });

  it('should return current user profile', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUsers.owner, error: null }),
        };
      }
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWorkspaces.free, error: null }),
        };
      }
      return defaultBuilder();
    });

    // Act
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.workspace).toBeDefined();
  });

  it('should reject request without auth header', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/auth/me');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject request with invalid token', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: Protected Routes ─────────────────────────────────────

describe('protected routes require authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMock();
    mockFrom.mockImplementation(() => defaultBuilder());
  });

  it('should reject /campaigns without auth', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/campaigns');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject /drafts without auth', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/drafts');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject /agent/rules without auth', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/agent/rules');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject /billing/subscription without auth', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/billing/subscription');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject requests with expired token', async () => {
    // Arrange
    const expiredToken = require('jsonwebtoken').sign(
      {
        sub: UUIDS.owner,
        email: mockUsers.owner.email,
        workspace_id: mockWorkspaces.free.id,
        role: 'owner',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      },
      process.env.JWT_SECRET ?? 'test-secret',
    );

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns')
      .set('Authorization', `Bearer ${expiredToken}`);

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject requests with malformed token', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/campaigns')
      .set('Authorization', 'Bearer not.a.valid.jwt');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /auth/refresh ───────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMock();
    mockFrom.mockImplementation(() => defaultBuilder());
  });

  it('should refresh token with valid refresh token', async () => {
    // Arrange
    const jwt = require('jsonwebtoken');
    const refreshToken = jwt.sign(
      { sub: UUIDS.owner, type: 'refresh' },
      process.env.JWT_SECRET ?? 'test-secret',
      { expiresIn: '30d' },
    );

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUsers.owner, error: null }),
        };
      }
      if (table === 'workspace_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWorkspaceMembers[0], error: null }),
        };
      }
      return defaultBuilder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: refreshToken });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  it('should reject invalid refresh token type', async () => {
    // Arrange
    const jwt = require('jsonwebtoken');
    const wrongTypeToken = jwt.sign(
      { sub: UUIDS.owner, type: 'access' }, // Wrong type
      process.env.JWT_SECRET ?? 'test-secret',
    );

    // Act
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: wrongTypeToken });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /auth/signout ───────────────────────────────────

describe('POST /api/v1/auth/signout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMock();
    mockFrom.mockImplementation(() => defaultBuilder());
  });

  it('should sign out successfully', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner');

    // Act
    const response = await request(app)
      .post('/api/v1/auth/signout')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
