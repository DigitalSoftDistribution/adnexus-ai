// ============================================
// AdNexus AI — E2E Auth Flow Tests
// ============================================
// End-to-end tests for authentication covering signup, signin, token
// management, password reset, and profile retrieval.

import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/index';
import {
  setupTestDB,
  teardownTestDB,
  cleanupTables,
  createTestUser,
  createTestWorkspace,
  addUserToWorkspace,
  generateAuthToken,
  generateRefreshToken,
  generateExpiredToken,
  generateMalformedToken,
  generateWrongSecretToken,
  getStoreCount,
  buildE2EMockFrom,
  buildE2EAuthMock,
  type TestUser,
  type TestWorkspace,
} from './setup';
import { UUIDS, mockUsers } from '../fixtures/data';

// ─── Mock Supabase with E2E Store ────────────────────────────────

const mockFrom = jest.fn();
// Holder for the store-backed auth mock. Reassigned in beforeEach so that
// `auth` / `auth.admin` always reflect the current test store state.
let mockAuth: ReturnType<typeof buildE2EAuthMock> | null = null;

// Proxy that forwards property access to whatever `mockAuth` currently holds,
// so the mocked `supabase.auth` (and `auth.admin.*`) always resolves against
// the latest store-backed implementation. Referenced lazily via a getter
// below so it survives jest.mock factory hoisting.
const authProxy = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (!mockAuth) {
        mockAuth = buildE2EAuthMock();
      }
      return (mockAuth as Record<string, unknown>)[prop];
    },
  },
);

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    get auth() {
      return authProxy;
    },
  },
}));

// ─── Suite Setup ─────────────────────────────────────────────────

describe('E2E: Authentication Flow', () => {
  let dbConfig: Awaited<ReturnType<typeof setupTestDB>>;
  let testOwner: TestUser;
  let testWorkspace: TestWorkspace;

  beforeAll(async () => {
    dbConfig = await setupTestDB();
    mockFrom.mockImplementation(buildE2EMockFrom());
    mockAuth = buildE2EAuthMock();
  });

  afterAll(async () => {
    await teardownTestDB(dbConfig);
  });

  beforeEach(async () => {
    await cleanupTables(['all']);
    jest.clearAllMocks();
    mockFrom.mockImplementation(buildE2EMockFrom());
    mockAuth = buildE2EAuthMock();
  });

  // ─── POST /auth/signup ───────────────────────────────────────

  describe('POST /api/v1/auth/signup', () => {
    it('should signup with valid data and return 201 with user + token', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New Test User',
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.name).toBe('New Test User');
      expect(response.body.data.workspace).toBeDefined();
    });

    it('should return 409 when signing up with existing email', async () => {
      // Arrange: create a user first
      await createTestUser({ email: 'existing@example.com', password: 'SecurePass123!', name: 'Existing User' });

      // Rebuild mock after user creation to pick up the new state
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act: try to signup with same email
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'Duplicate User',
        });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when signing up with invalid email', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'not-a-valid-email',
          password: 'SecurePass123!',
          name: 'Invalid Email User',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when password is too short', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'shortpass@example.com',
          password: 'short',
          name: 'Short Password User',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when name is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'noname@example.com',
          password: 'SecurePass123!',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when email is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          password: 'SecurePass123!',
          name: 'No Email User',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when password is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'nopass@example.com',
          name: 'No Password User',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /auth/signin ───────────────────────────────────────

  describe('POST /api/v1/auth/signin', () => {
    beforeEach(async () => {
      // Create a known user with a known password
      testOwner = await createTestUser({
        email: 'signin-test@example.com',
        password: 'CorrectPass123!',
        name: 'Signin Test User',
      });
      testWorkspace = await createTestWorkspace({ ownerId: testOwner.id });
      await addUserToWorkspace(testOwner.id, testWorkspace.id, 'owner');

      // Refresh the mock to include the newly created user
      mockFrom.mockImplementation(buildE2EMockFrom());
    });

    it('should signin with valid credentials and return 200 with token', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'signin-test@example.com',
          password: 'CorrectPass123!',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.workspace).toBeDefined();
    });

    it('should return 401 when password is wrong', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'signin-test@example.com',
          password: 'WrongPassword456!',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when user does not exist', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'nonexistent@nowhere.com',
          password: 'AnyPassword123!',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when email format is invalid', async () => {
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

    it('should return 400 when email is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          password: 'password123',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when password is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'signin-test@example.com',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── GET /auth/me ────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    beforeEach(async () => {
      testOwner = await createTestUser({
        email: 'me-test@example.com',
        password: 'SecurePass123!',
        name: 'Me Test User',
      });
      testWorkspace = await createTestWorkspace({ ownerId: testOwner.id });
      await addUserToWorkspace(testOwner.id, testWorkspace.id, 'owner');
      mockFrom.mockImplementation(buildE2EMockFrom());
    });

    it('should return 200 and user profile with valid token', async () => {
      // Arrange
      const token = generateAuthToken(testOwner.id, 'owner', testWorkspace.id);

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

    it('should return 401 when no token is provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/me');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when token is expired', async () => {
      // Arrange
      const expiredToken = generateExpiredToken(testOwner.id, 'owner', testWorkspace.id);

      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when token is malformed', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${generateMalformedToken()}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when token has wrong secret', async () => {
      // Arrange
      const wrongToken = generateWrongSecretToken(testOwner.id);

      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${wrongToken}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when Authorization header format is wrong', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic invalid-format');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /auth/refresh ──────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(async () => {
      testOwner = await createTestUser({
        email: 'refresh-test@example.com',
        password: 'SecurePass123!',
        name: 'Refresh Test User',
      });
      testWorkspace = await createTestWorkspace({ ownerId: testOwner.id });
      await addUserToWorkspace(testOwner.id, testWorkspace.id, 'owner');
      mockFrom.mockImplementation(buildE2EMockFrom());
    });

    it('should refresh token and return 200 with new token', async () => {
      // Arrange
      const refreshToken = generateRefreshToken(testOwner.id);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
    });

    it('should return 401 when refresh token is expired', async () => {
      // Arrange: create an expired refresh token
      const jwt = require('jsonwebtoken');
      const expiredRefreshToken = jwt.sign(
        { sub: testOwner.id, type: 'refresh' },
        process.env.JWT_SECRET ?? 'test-secret',
        { expiresIn: '-1h' },
      );

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: expiredRefreshToken });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when refresh token has wrong type', async () => {
      // Arrange: use an access token as refresh token
      const accessToken = generateAuthToken(testOwner.id);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: accessToken });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when refresh_token is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /auth/forgot-password ──────────────────────────────

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      testOwner = await createTestUser({
        email: 'reset-test@example.com',
        password: 'SecurePass123!',
        name: 'Reset Test User',
      });
      mockFrom.mockImplementation(buildE2EMockFrom());
    });

    it('should request password reset and return 200 for existing user', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset-test@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('reset');
    });

    it('should return 200 for non-existent email (privacy protection)', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@privacy-test.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should not reveal whether email exists
      expect(response.body.data.message.toLowerCase()).toContain('if');
    });

    it('should return 400 for invalid email format', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when email is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /auth/signout ──────────────────────────────────────

  describe('POST /api/v1/auth/signout', () => {
    beforeEach(async () => {
      testOwner = await createTestUser({
        email: 'signout-test@example.com',
        password: 'SecurePass123!',
        name: 'Signout Test User',
      });
      mockFrom.mockImplementation(buildE2EMockFrom());
    });

    it('should sign out successfully with valid token', async () => {
      // Arrange
      const token = generateAuthToken(testOwner.id);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/signout')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 when signing out without token', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/signout');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── Complete Auth Flow ──────────────────────────────────────

  describe('complete auth flow', () => {
    it('should handle full signup -> signin -> me -> refresh -> signout lifecycle', async () => {
      // Step 1: Signup
      const signupResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'lifecycle@example.com',
          password: 'LifecyclePass123!',
          name: 'Lifecycle User',
        });

      expect(signupResponse.status).toBe(201);
      expect(signupResponse.body.data.token).toBeDefined();
      const accessToken = signupResponse.body.data.token;

      // Step 2: Get profile with token
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.user.email).toBe('lifecycle@example.com');

      // Step 3: Signin with credentials
      const signinResponse = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'lifecycle@example.com',
          password: 'LifecyclePass123!',
        });

      expect(signinResponse.status).toBe(200);
      expect(signinResponse.body.data.token).toBeDefined();

      // Step 4: Refresh token
      const refreshToken = generateRefreshToken(
        signupResponse.body.data.user.id || UUIDS.owner,
      );
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.token).toBeDefined();

      // Step 5: Sign out
      const signoutResponse = await request(app)
        .post('/api/v1/auth/signout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(signoutResponse.status).toBe(200);
      expect(signoutResponse.body.success).toBe(true);
    });
  });
});
