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

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ─── Suite: POST /auth/signup ────────────────────────────────────

describe('POST /api/v1/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
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
    // Arrange
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
          insert: mockInsert.mockReturnThis(),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

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
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
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
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

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
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
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

describe('POST /api/v1/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initiate password reset for existing user', async () => {
    // Arrange
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
        };
      }
      if (table === 'password_resets') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'owner@example.com' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toContain('reset');
  });

  it('should return success even for non-existent email (privacy)', async () => {
    // Arrange
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
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
      .post('/api/v1/auth/forgot-password')
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
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
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
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWorkspaceMembers[0], error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
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
