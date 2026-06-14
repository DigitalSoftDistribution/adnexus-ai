import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars';
  process.env.ENCRYPTION_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import {
  EmailNotVerifiedError,
  requireAuth,
  requireVerifiedEmail,
  type AuthenticatedRequest,
} from './requireAuth';
import { config } from '../../../config';

function makeResponse() {
  return {} as Response;
}

describe('v2 auth middleware email verification state', () => {
  it('preserves emailVerified from signed JWTs for downstream launch gates', () => {
    const token = jwt.sign(
      {
        sub: 'user-1',
        email: 'owner@example.com',
        workspace_id: 'ws-1',
        role: 'owner',
        emailVerified: true,
      },
      config.jwt.secret,
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as AuthenticatedRequest;
    const next = vi.fn();

    requireAuth(req, makeResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({
      id: 'user-1',
      email: 'owner@example.com',
      workspaceId: 'ws-1',
      role: 'owner',
      emailVerified: true,
    });
  });

  it('blocks unverified v2 users from credential-backed billing actions', () => {
    const req = {
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        workspaceId: 'ws-1',
        role: 'owner',
        emailVerified: false,
      },
    } as unknown as AuthenticatedRequest;
    const next = vi.fn();

    requireVerifiedEmail(req, makeResponse(), next);

    const error = next.mock.calls[0]?.[0] as EmailNotVerifiedError;
    expect(error).toBeInstanceOf(EmailNotVerifiedError);
    expect(error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(error.statusCode).toBe(403);
  });
});
