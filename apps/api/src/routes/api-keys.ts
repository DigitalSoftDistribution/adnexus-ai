/**
 * API Key Management Routes
 * =========================
 * GET  /api/v1/api-keys      — List all API keys for the workspace
 * POST /api/v1/api-keys      — Create a new API key (returns full key once)
 * DELETE /api/v1/api-keys/:id — Revoke an API key
 *
 * Security:
 *   - All routes require authentication
 *   - Keys are scoped to a workspace
 *   - Only the key prefix and metadata are stored/returned after creation
 *   - The full key is generated once and returned only on creation
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validateRequest';
import { NotFoundError, ValidationError } from '../lib/errors';
import { getRequestLogger } from '../lib/logger';
import crypto from 'crypto';

const router = Router();
const logger = (req: { headers: Record<string, string | string[] | undefined> }) =>
  getRequestLogger((req.headers['x-request-id'] as string) ?? 'api-keys-route');

// ═══════════════════════════════════════════════════════════════
// Zod Schemas
// ═══════════════════════════════════════════════════════════════

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  scopes: z
    .array(z.enum(['read', 'write', 'admin']))
    .min(1, 'At least one scope is required')
    .max(3, 'Invalid scopes'),
});

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Generate a cryptographically secure API key */
function generateApiKey(): string {
  const prefix = 'ak_live_';
  const randomBytes = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomBytes}`;
}

/** Generate a user-facing prefix for display (e.g., ak_live_...X8f2) */
function generateKeyPrefix(fullKey: string): string {
  if (fullKey.length <= 12) return fullKey;
  return `${fullKey.slice(0, 8)}...${fullKey.slice(-4)}`;
}

/** Hash a key for storage (we never store the full key) */
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** Build the API key response (never includes the full key) */
function buildKeyResponse(record: Record<string, unknown>) {
  return {
    id: record.id as string,
    name: record.name as string,
    prefix: record.key_prefix as string,
    scopes: record.scopes as string[],
    status: record.status as 'active' | 'revoked',
    createdAt: record.created_at as string,
    lastUsedAt: record.last_used_at as string | null,
    expiresAt: record.expires_at as string | null,
    callsToday: (record.calls_today as number) ?? 0,
    callsThisMonth: (record.calls_this_month as number) ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/api-keys — List API keys
// ═══════════════════════════════════════════════════════════════

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, status, created_at, last_used_at, expires_at, calls_today, calls_this_month')
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

    // Generate the full key (shown only once)
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
        status: 'active',
        created_by: userId,
      })
      .select('id, name, key_prefix, scopes, status, created_at, last_used_at, expires_at, calls_today, calls_this_month')
      .single();

    if (error || !keyRecord) {
      logger(req).error({ error: error?.message }, 'Failed to create API key');
      throw new ValidationError(`Failed to create API key: ${error?.message ?? 'Unknown error'}`);
    }

    logger(req).info(
      { keyId: keyRecord.id, workspaceId, scopes: body.scopes },
      'API key created',
    );

    res.status(201).json({
      success: true,
      data: {
        key: buildKeyResponse(keyRecord as Record<string, unknown>),
        fullKey, // Shown only once on creation
      },
      message: 'API key created successfully. Copy the full key now — it will not be shown again.',
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

    // Verify the key belongs to this workspace
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
      .select('id, name, key_prefix, scopes, status, created_at, last_used_at, expires_at, calls_today, calls_this_month')
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

export default router;
