import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireAuth, requireRole, requireAdmin, requireMember } from '../../src/middleware/auth';
import { UnauthorizedError, ForbiddenError } from '../../src/lib/errors';
import {
  createAndStoreRefreshToken,
  hashRefreshToken,
  rotateRefreshToken,
  TokenReuseDetectedError,
} from '../../src/services/refresh-token-service';
import { mockUsers, mockWorkspaces, mockWorkspaceMembers, UUIDS } from '../fixtures/data';
import { generateToken, generateExpiredToken, generateMalformedToken, generateWrongSecretToken, createMockRequest, createMockResponse, createMockNext } from '../utils/helpers';
import { mockClientQuery } from '../setup';

// ─── Mock Supabase ───────────────────────────────────────────────

const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseEq = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// ─── Suite: authenticateToken ────────────────────────────────────

describe('authenticateToken middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect.mockReturnThis(),
      eq: mockSupabaseEq.mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
    });
  });

  describe('valid token', () => {
    it('should set req.user and req.workspaceId for a valid token', async () => {
      // Arrange
      const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
      const req = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(req.user).toBeDefined();
      expect(req.user!.sub).toBe(UUIDS.owner);
      expect(req.user!.workspace_id).toBe(mockWorkspaces.free.id);
      expect(req.workspaceId).toBe(mockWorkspaces.free.id);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with UnauthorizedError when user no longer exists', async () => {
      // Arrange
      mockSupabaseFrom.mockReturnValue({
        select: mockSupabaseSelect.mockReturnThis(),
        eq: mockSupabaseEq.mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('User not found') }),
      });

      const token = generateToken(UUIDS.owner, 'owner');
      const req = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('User no longer exists');
    });
  });

  describe('missing token', () => {
    it('should call next with UnauthorizedError when Authorization header is missing', async () => {
      // Arrange
      const req = createMockRequest({ headers: {} });
      delete (req as unknown as Record<string, unknown>).user;
      (req as unknown as Record<string, unknown>).headers = {};
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Missing or invalid Authorization header');
    });

    it('should call next with UnauthorizedError when Authorization header does not start with Bearer', async () => {
      // Arrange
      const req = createMockRequest({ headers: { authorization: 'Basic dXNlcjpwYXNzd29yZA==' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
      expect(error).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('expired token', () => {
    it('should call next with UnauthorizedError for expired token', async () => {
      // Arrange
      const expiredToken = generateExpiredToken(UUIDS.owner, 'owner');
      const req = createMockRequest({ headers: { authorization: `Bearer ${expiredToken}` } });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('malformed token', () => {
    it('should call next with UnauthorizedError for malformed token', async () => {
      // Arrange
      const malformedToken = generateMalformedToken();
      const req = createMockRequest({ headers: { authorization: `Bearer ${malformedToken}` } });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('token with wrong secret', () => {
    it('should call next with UnauthorizedError for token signed with wrong secret', async () => {
      // Arrange
      const wrongToken = generateWrongSecretToken(UUIDS.owner);
      const req = createMockRequest({ headers: { authorization: `Bearer ${wrongToken}` } });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid token');
    });
  });
});

// ─── Suite: requireAuth ──────────────────────────────────────────

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
    });
  });

  it('should call authenticateToken and pass through on valid auth', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner');
    const req = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockResponse();
    const next = createMockNext();

    // Act
    await requireAuth(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ─── Suite: requireRole ──────────────────────────────────────────

describe('requireRole middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow owner to access owner-only routes', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.owner, role: 'owner' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
    });

    const middleware = requireRole('owner');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should allow admin to access admin routes', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.admin, role: 'admin' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    });

    const middleware = requireRole('owner', 'admin');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should allow analyst to access analyst routes', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.analyst, role: 'analyst' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'analyst' }, error: null }),
    });

    const middleware = requireRole('owner', 'admin', 'analyst');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should allow viewer to access viewer routes', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.viewer, role: 'viewer' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
    });

    const middleware = requireRole('owner', 'admin', 'analyst', 'viewer');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should reject viewer accessing owner-only routes', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.viewer, role: 'viewer' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
    });

    const middleware = requireRole('owner');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.message).toBe('Required role: owner');
  });

  it('should reject admin accessing owner-only routes', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.admin, role: 'admin' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    });

    const middleware = requireRole('owner');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.message).toBe('Required role: owner');
  });

  it('should reject unauthenticated requests', async () => {
    // Arrange
    const req = createMockRequest({ headers: {} });
    delete (req as unknown as Record<string, unknown>).user;
    delete (req as unknown as Record<string, unknown>).workspaceId;
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requireRole('owner', 'admin');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('should reject when user is not a workspace member', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: 'non-member-id', role: 'viewer' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const middleware = requireRole('owner', 'admin', 'analyst', 'viewer');

    // Act
    await middleware(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.message).toBe('Not a member of this workspace');
  });
});

// ─── Suite: requireAdmin shorthand ───────────────────────────────

describe('requireAdmin', () => {
  it('should allow owner through', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.owner, role: 'owner' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
    });

    // Act
    await requireAdmin(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should allow admin through', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.admin, role: 'admin' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    });

    // Act
    await requireAdmin(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should reject analyst', async () => {
    // Arrange
    const req = createMockRequest({ user: { sub: UUIDS.analyst, role: 'analyst' } });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'analyst' }, error: null }),
    });

    // Act
    await requireAdmin(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
    expect(error).toBeInstanceOf(ForbiddenError);
  });
});

// ─── Suite: requireMember shorthand ──────────────────────────────

describe('requireMember', () => {
  it('should allow all workspace roles', async () => {
    const roles: Array<'owner' | 'admin' | 'analyst' | 'viewer'> = ['owner', 'admin', 'analyst', 'viewer'];

    for (const role of roles) {
      // Arrange
      jest.clearAllMocks();
      const userId = UUIDS[role] ?? UUIDS.owner;
      const req = createMockRequest({ user: { sub: userId, role } });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role }, error: null }),
      });

      // Act
      await requireMember(req, res as unknown as Response, next as unknown as NextFunction);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    }
  });
});

// ─── Suite: workspace scoping ────────────────────────────────────

describe('workspace scoping', () => {
  it('should scope requests to the correct workspace from JWT payload', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
      user: { sub: UUIDS.owner, workspace_id: mockWorkspaces.free.id, role: 'owner' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
    });

    // Act
    await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(req.workspaceId).toBe(mockWorkspaces.free.id);
    expect(req.user!.workspace_id).toBe(mockWorkspaces.free.id);
  });

  it('should handle cross-workspace isolation', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.pro.id);
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
      user: { sub: UUIDS.owner, workspace_id: mockWorkspaces.pro.id, role: 'owner' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
    });

    // Act
    await authenticateToken(req, res as unknown as Response, next as unknown as NextFunction);

    // Assert
    expect(req.workspaceId).toBe(mockWorkspaces.pro.id);
    // Should NOT be workspace1
    expect(req.workspaceId).not.toBe(mockWorkspaces.free.id);
  });
});

// ─── Suite: refresh token rotation (AUTH-001) ──────────────────

describe('refresh token rotation', () => {
  beforeEach(() => {
    mockClientQuery.mockReset();
    mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('hashRefreshToken should produce stable sha256 hex', () => {
    const hash = hashRefreshToken('sample-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken('sample-token')).toBe(hash);
  });

  it('createAndStoreRefreshToken should persist a refresh token row', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 'new-token-id' }], rowCount: 1 });

    const refreshToken = await createAndStoreRefreshToken(UUIDS.owner);

    expect(typeof refreshToken).toBe('string');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET ?? 'test-jwt-secret-key-for-testing-only') as jwt.JwtPayload;
    expect(decoded.sub).toBe(UUIDS.owner);
    expect(decoded.type).toBe('refresh');
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO refresh_tokens'),
      expect.arrayContaining([UUIDS.owner, hashRefreshToken(refreshToken)]),
    );
  });

  it('rotateRefreshToken should revoke old token and return a new pair', async () => {
    const refreshToken = jwt.sign(
      { sub: UUIDS.owner, type: 'refresh' },
      process.env.JWT_SECRET ?? 'test-jwt-secret-key-for-testing-only',
      { expiresIn: '7d' },
    );

    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'old-token-id',
          user_id: UUIDS.owner,
          revoked_at: null,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ id: 'new-token-id' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await rotateRefreshToken(refreshToken);

    expect(result.userId).toBe(UUIDS.owner);
    expect(result.refreshToken).not.toBe(refreshToken);
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE'),
      [hashRefreshToken(refreshToken)],
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET revoked_at = NOW(), replaced_by = $2'),
      ['old-token-id', 'new-token-id'],
    );
  });

  it('rotateRefreshToken should revoke all sessions when a revoked token is reused', async () => {
    const refreshToken = jwt.sign(
      { sub: UUIDS.owner, type: 'refresh' },
      process.env.JWT_SECRET ?? 'test-jwt-secret-key-for-testing-only',
      { expiresIn: '7d' },
    );

    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'revoked-token-id',
          user_id: UUIDS.owner,
          revoked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await expect(rotateRefreshToken(refreshToken)).rejects.toBeInstanceOf(TokenReuseDetectedError);
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1 AND revoked_at IS NULL'),
      [UUIDS.owner],
    );
  });

  it('rotateRefreshToken should reject tokens missing from the database', async () => {
    const refreshToken = jwt.sign(
      { sub: UUIDS.owner, type: 'refresh' },
      process.env.JWT_SECRET ?? 'test-jwt-secret-key-for-testing-only',
      { expiresIn: '7d' },
    );

    await expect(rotateRefreshToken(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
