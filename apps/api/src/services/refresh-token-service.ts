import { createHash, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { config } from '../config';
import { transaction } from '../db/connection';
import { UnauthorizedError } from '../lib/errors';

interface RefreshTokenRow {
  id: string;
  user_id: string;
  revoked_at: Date | string | null;
  expires_at: Date | string;
}

export class TokenReuseDetectedError extends UnauthorizedError {
  constructor() {
    super('Refresh token reuse detected. All sessions have been revoked.');
    this.name = 'TokenReuseDetectedError';
  }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signRefreshTokenJwt(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', jti: randomUUID() },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as unknown as number },
  );
}

function refreshTokenExpiresAt(token: string): Date {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  if (decoded?.exp) {
    return new Date(decoded.exp * 1000);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

async function insertRefreshToken(
  client: PoolClient,
  userId: string,
  refreshToken: string,
  ipAddress?: string,
  replacedBy?: string,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, replaced_by)
     VALUES ($1, $2, $3, $4::inet, $5)
     RETURNING id`,
    [userId, hashRefreshToken(refreshToken), refreshTokenExpiresAt(refreshToken), ipAddress ?? null, replacedBy ?? null],
  );
  return rows[0].id;
}

async function revokeAllUserRefreshTokens(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

/**
 * Issue a refresh JWT and persist its hash for rotation tracking.
 */
export async function createAndStoreRefreshToken(
  userId: string,
  ipAddress?: string,
): Promise<string> {
  const refreshToken = signRefreshTokenJwt(userId);

  await transaction(async (client) => {
    await insertRefreshToken(client, userId, refreshToken, ipAddress);
  });

  return refreshToken;
}

export interface RotateRefreshTokenResult {
  userId: string;
  accessTokenPayload: { sub: string; type?: string };
  refreshToken: string;
}

/**
 * Verify refresh token, rotate atomically, and detect reuse of revoked tokens.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  ipAddress?: string,
): Promise<RotateRefreshTokenResult> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.secret, {
      clockTolerance: 60,
    }) as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  if (payload.type !== 'refresh' || !payload.sub) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const tokenHash = hashRefreshToken(refreshToken);

  return transaction(async (client) => {
    const { rows } = await client.query<RefreshTokenRow>(
      `SELECT id, user_id, revoked_at, expires_at
       FROM refresh_tokens
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash],
    );

    const stored = rows[0];

    if (!stored) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (stored.revoked_at) {
      await revokeAllUserRefreshTokens(client, stored.user_id);
      throw new TokenReuseDetectedError();
    }

    if (new Date(stored.expires_at) < new Date()) {
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
        [stored.id],
      );
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const newRefreshToken = signRefreshTokenJwt(stored.user_id);
    const newTokenId = await insertRefreshToken(
      client,
      stored.user_id,
      newRefreshToken,
      ipAddress,
    );

    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), replaced_by = $2
       WHERE id = $1`,
      [stored.id, newTokenId],
    );

    return {
      userId: stored.user_id,
      accessTokenPayload: { sub: stored.user_id, type: 'refresh' },
      refreshToken: newRefreshToken,
    };
  });
}
