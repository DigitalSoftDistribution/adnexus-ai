import { describe, it, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { parseScopes, requireScope, expandLegacyScopes } from './scopeCheck';

function runScopeCheck(
  required: string,
  stored: string[],
  platforms: string[] = ['meta', 'google', 'tiktok', 'snap'],
): boolean {
  let allowed = false;

  const req = {
    user: { apiKeyId: 'key-1', sub: 'u-1' },
    apiKeyScopes: stored,
    apiKeyPlatforms: platforms,
  } as Request;

  requireScope(required)(req, {} as Response, ((err?: unknown) => {
    if (!err) allowed = true;
  }) as NextFunction);

  return allowed;
}

describe('scopeCheck', () => {
  describe('parseScopes', () => {
    it('parses resource:operation scopes', () => {
      expect(parseScopes(['campaigns:read'])).toEqual([
        { resource: 'campaigns', operation: 'read', platform: null },
      ]);
    });

    it('parses resource:operation:platform scopes', () => {
      expect(parseScopes(['campaigns:admin:meta'])).toEqual([
        { resource: 'campaigns', operation: 'admin', platform: 'meta' },
      ]);
    });

    it('filters invalid scopes', () => {
      expect(parseScopes(['invalid', 'campaigns:read:meta'])).toEqual([
        { resource: 'campaigns', operation: 'read', platform: 'meta' },
      ]);
    });
  });

  describe('requireScope', () => {
    it('allows admin scope for read on same platform', () => {
      expect(runScopeCheck('campaigns:read:meta', ['campaigns:admin:meta'])).toBe(true);
    });

    it('denies admin scope on one platform for another platform', () => {
      expect(runScopeCheck('campaigns:read:google', ['campaigns:admin:meta'])).toBe(false);
    });

    it('denies when key platforms exclude required platform', () => {
      expect(
        runScopeCheck('campaigns:read:google', ['campaigns:read:google'], ['meta']),
      ).toBe(false);
    });

    it('allows wildcard read scope without platform suffix', () => {
      expect(runScopeCheck('campaigns:read', ['campaigns:read'])).toBe(true);
    });
  });

  describe('expandLegacyScopes', () => {
    it('expands legacy read/write scopes to resource grants', () => {
      const expanded = expandLegacyScopes(['read', 'write']);
      expect(expanded).toContain('campaigns:read');
      expect(expanded).toContain('campaigns:write');
      expect(expanded).not.toContain('read');
    });

    it('leaves modern scopes unchanged', () => {
      const scopes = ['campaigns:read:meta'];
      expect(expandLegacyScopes(scopes)).toEqual(scopes);
    });
  });
});
