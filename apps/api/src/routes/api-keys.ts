/**
 * API Key Management Routes
 * =========================
 * GET  /api/v1/api-keys         — List all API keys for the workspace
 * POST /api/v1/api-keys         — Create a new API key (returns full key once)
 * DELETE /api/v1/api-keys/:id    — Revoke an API key
 * GET  /api/v1/api-keys/stats    — Usage statistics
 * GET  /api/v1/api-keys/scopes   — List valid scope strings
 *
 * Security:
 *   - All routes require authentication
 *   - Keys are scoped to a workspace
 *   - Only the key prefix and metadata are stored/returned after creation
 *   - The full key is generated once and returned only on creation
 *   - Keys now support granular scopes (resource:operation[:platform])
 *   - Keys now support platform-level isolation
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validateRequest';
import { NotFoundError, ValidationError } from '../lib/errors';
import { getRequestLogger } from '../lib/logger';
import { generateValidScopes } from '../middleware/scopeCheck';
import crypto from 'crypto';

const router = Router();
const logger = (req: { headers: Record<string, string | string[] | undefined> }) =>
  getRequestLogger((req.headers['x-request-id'] as string) ?? 'api-keys-route');

const SUPPORTED_PLATFORMS = ['meta', 'google', 'tiktok', 'snap'] as const;
const SUPPORTED_OPERATIONS = ['read', 'write', 'admin'] as const;
const SUPPORTED_RESOURCES = [
  'campaigns', 'ads', 'drafts', 'reports', 'audiences', 'settings',
  'notifications', 'billing', 'goals', 'exports', 'search', 'rag',
  'webhooks', 'audit-log', 'comments', 'alerts', 'agent',
] as const;

// ═══════════════════════════════════════════════════════════════
// Zod Schemas
// ═══════════════════════════════════════════════════════════════

const scopeStringSchema = z.string().refine(
  (val) => {
    const parts = val.split(':');
    if (parts.length < 2 || parts.length > 3) return false;

    const [resource, operation, platform] = parts;

    if (!(SUPPORTED_RESOURCES as readonly string[]).includes(resource)) return false;
    if (!(SUPPORTED_OPERATIONS as readonly string[]).includes(operation)) return false;

    if (platform) {
      if (!(SUPPORTED_PLATFORMS as readonly string[]).includes(platform)) return false;
    }

    return true;
  },
  { message: 'Invalid scope format. Use: resource:operation[:platform]' },
);

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  scopes: z
    .array(scopeStringSchema)
    .min(1, 'At least one scope is required'),
  platforms: z
    .array(z.enum(['meta', 'google', 'tiktok', 'snap']))
    .min(1, 'At least one platform is required')
    .max(4, 'Invalid platforms'),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  scopes: z.array(scopeStringSchema).min(1, 'At least one scope is required').optional(),
  platforms: z
    .array(z.enum(['meta', 'google', 'tiktok', 'snap']))
    .min(1, 'At least one platform is required')
    .max(4, 'Invalid platforms')
    .optional(),
});

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function generateApiKey(): string {
  const prefix = 'ak_live_';
  const randomBytes = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomBytes}`;
}

function generateKeyPrefix(fullKey: string): string {
  if (fullKey.length <= 12) return fullKey;
  return `${fullKey.slice(0, 8)}...${fullKey.slice(-4)}`;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function buildKeyResponse(record: Record<string, unknown>) {
  const platforms = Array.isArray(record.platforms)
    ? (record.platforms as string[])
    : (typeof record.platforms === 'string'
      ? JSON.parse(record.platforms as string)
      : []);

  const scopes = Array.isArray(record.scopes)
    ? (record.scopes as string[])
    : (typeof record.scopes === 'string'
      ? JSON.parse(record.scopes as string)
      : []);

  return {
    id: record.id as string,
    name: record.name as string,
    prefix: record.key_prefix as string,
    scopes,
    platforms,
    status: record.status as 'active' | 'revoked',
    createdAt: record.created_at as string,
    lastUsedAt: record.last_used_at as string | null,
    expiresAt: record.expires_at as string | null,
    callsToday: (record.calls_today as number) ?? 0,
    callsThisMonth: (record.calls_this_month as number) ?? 0,
  };
}

function filterScopesByPlatforms(
  scopes: string[],
  platforms: string[],
): string[] {
  return scopes.filter((scope) => {
    const parts = scope.split(':');
    if (parts.length === 3) {
      return platforms.includes(parts[2]);
    }
    return true;
  });
}

function validateScopesAgainstPlatforms(scopes: string[], platforms: string[]): void {
  const mismatched = scopes.filter((scope) => {
    const parts = scope.split(':');
    return parts.length === 3 && !platforms.includes(parts[2]);
  });

  if (mismatched.length > 0) {
    throw new ValidationError(
      `Platform-specific scopes must match selected platforms: ${mismatched.join(', ')}`,
    );
  }

  const platformSpecific = scopes.filter((scope) => scope.split(':').length === 3);
  if (platformSpecific.length > 0) {
    const filtered = filterScopesByPlatforms(scopes, platforms);
    if (filtered.length === 0) {
      throw new ValidationError(
        'No scopes match the selected platforms. Platform-specific scopes (e.g., "campaigns:read:meta") ' +
        'must match at least one platform in the platforms array.',
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/api-keys/scopes — List valid scope strings
// ═══════════════════════════════════════════════════════════════

router.get(
  '/scopes',
  asyncHandler(async (_req, res) => {
    const allScopes = generateValidScopes();

    const grouped = {
      platforms: SUPPORTED_PLATFORMS,
      operations: SUPPORTED_OPERATIONS,
      resources: SUPPORTED_RESOURCES,
      scopes: allScopes,
    };

    res.json({
      success: true,
      data: grouped,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/api-keys/stats — Usage statistics
// ═══════════════════════════════════════════════════════════════

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('status, calls_today, calls_this_month')
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ValidationError(`Failed to fetch stats: ${error.message}`);
    }

    const keyList = keys ?? [];
    const activeKeys = keyList.filter((k) => k.status === 'active').length;
    const revokedKeys = keyList.filter((k) => k.status === 'revoked').length;
    const totalCallsToday = keyList.reduce((sum, k) => sum + (k.calls_today ?? 0), 0);
    const totalCallsThisMonth = keyList.reduce((sum, k) => sum + (k.calls_this_month ?? 0), 0);

    res.json({
      success: true,
      data: {
        totalCallsToday,
        totalCallsThisMonth,
        activeKeys,
        revokedKeys,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/api-keys — List API keys
// ═══════════════════════════════════════════════════════════════

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, platforms, status, created_at, last_used_at, expires_at, calls_today, calls_this_month')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      logger(req).error({ error: error.message }, 'Failed to list API keys');
      throw new ValidationError(`Failed to list API keys: ${error.message}`);
    }

    const results = (keys ?? []).map((k) => buildKeyResponse(k as Record<string, unknown>));

    res.json({
      success: true,
      data: results,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/api-keys — Create a new API key
// ═══════════════════════════════════════════════════════════════

router.post(
  '/',
  validateRequest(createApiKeySchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.user?.sub;
    const body = req.body as z.infer<typeof createApiKeySchema>;

    if (body.scopes.length > 0 && body.platforms.length > 0) {
      validateScopesAgainstPlatforms(body.scopes, body.platforms);
    }

    const fullKey = generateApiKey();
    const keyPrefix = generateKeyPrefix(fullKey);
    const keyHash = hashKey(fullKey);

    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .insert({
        workspace_id: workspaceId,
        name: body.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: body.scopes,
        platforms: body.platforms,
        status: 'active',
        created_by: userId,
      })
      .select('id, name, key_prefix, scopes, platforms, status, created_at, last_used_at, expires_at, calls_today, calls_this_month')
      .single();

    if (error || !keyRecord) {
      logger(req).error({ error: error?.message }, 'Failed to create API key');
      throw new ValidationError(`Failed to create API key: ${error?.message ?? 'Unknown error'}`);
    }

    logger(req).info(
      { keyId: keyRecord.id, workspaceId, scopes: body.scopes, platforms: body.platforms },
      'API key created',
    );

    res.status(201).json({
      success: true,
      data: {
        key: buildKeyResponse(keyRecord as Record<string, unknown>),
        fullKey,
      },
      message: 'API key created successfully. Copy the full key now — it will not be shown again.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// PATCH /api/v1/api-keys/:id — Update an API key
// ═══════════════════════════════════════════════════════════════

router.patch(
  '/:id',
  validateRequest(updateApiKeySchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const keyId = req.params.id;
    const body = req.body as z.infer<typeof updateApiKeySchema>;

    const { data: existingKey, error: findError } = await supabase
      .from('api_keys')
      .select('id, name, status, scopes, platforms')
      .eq('id', keyId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !existingKey) {
      throw new NotFoundError('API key');
    }

    if (existingKey.status === 'revoked') {
      throw new ValidationError('Cannot update a revoked API key');
    }

    const scopes = body.scopes ?? (existingKey.scopes as string[] ?? []);
    const platforms = body.platforms ?? (existingKey.platforms as string[] ?? SUPPORTED_PLATFORMS);

    if (body.scopes !== undefined || body.platforms !== undefined) {
      validateScopesAgainstPlatforms(scopes, platforms);
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.scopes !== undefined) updates.scopes = body.scopes;
    if (body.platforms !== undefined) updates.platforms = body.platforms;

    const { data: updatedKey, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', keyId)
      .eq('workspace_id', workspaceId)
      .select('id, name, key_prefix, scopes, platforms, status, created_at, last_used_at, expires_at, calls_today, calls_this_month')
      .single();

    if (error) {
      logger(req).error({ error: error.message, keyId }, 'Failed to update API key');
      throw new ValidationError(`Failed to update API key: ${error.message}`);
    }

    logger(req).info(
      { keyId, name: body.name ?? existingKey.name },
      'API key updated',
    );

    res.json({
      success: true,
      data: buildKeyResponse(updatedKey as Record<string, unknown>),
      message: 'API key updated successfully.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// DELETE /api/v1/api-keys/:id — Revoke an API key
// ═══════════════════════════════════════════════════════════════

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const keyId = req.params.id;

    const { data: existingKey, error: findError } = await supabase
      .from('api_keys')
      .select('id, name, status')
      .eq('id', keyId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !existingKey) {
      throw new NotFoundError('API key');
    }

    if (existingKey.status === 'revoked') {
      throw new ValidationError('API key is already revoked');
    }

    const { data: updatedKey, error } = await supabase
      .from('api_keys')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: req.user?.sub,
      })
      .eq('id', keyId)
      .eq('workspace_id', workspaceId)
      .select('id, name, key_prefix, scopes, platforms, status, created_at, last_used_at, expires_at, calls_today, calls_this_month')
      .single();

    if (error) {
      logger(req).error({ error: error.message, keyId }, 'Failed to revoke API key');
      throw new ValidationError(`Failed to revoke API key: ${error.message}`);
    }

    logger(req).info(
      { keyId, name: existingKey.name },
      'API key revoked',
    );

    res.json({
      success: true,
      data: buildKeyResponse(updatedKey as Record<string, unknown>),
      message: `API key "${existingKey.name}" has been revoked.`,
    });
  }),
);

export default router;
