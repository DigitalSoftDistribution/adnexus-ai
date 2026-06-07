import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors';

const OPERATION_HIERARCHY: Record<string, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

interface ParsedScope {
  resource: string;
  operation: string;
  platform: string | null;
}

function parseScope(scope: string): ParsedScope | null {
  const parts = scope.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const [resource, operation, platform] = parts;
  if (!OPERATION_HIERARCHY[operation]) return null;
  return {
    resource,
    operation,
    platform: platform ?? null,
  };
}

export function parseScopes(scopes: string[]): ParsedScope[] {
  return scopes.map(parseScope).filter((s): s is ParsedScope => s !== null);
}

function scopeCovers(required: ParsedScope, stored: ParsedScope): boolean {
  if (required.resource !== stored.resource) return false;

  const storedLevel = OPERATION_HIERARCHY[stored.operation] ?? 0;
  const requiredLevel = OPERATION_HIERARCHY[required.operation] ?? 0;

  if (storedLevel < requiredLevel) return false;

  // Platform suffix applies at every operation level, including admin.
  if (required.platform) {
    if (stored.platform && stored.platform !== required.platform) {
      return false;
    }
  }

  return true;
}

function isPlatformAllowed(required: ParsedScope, req: Request): boolean {
  if (!required.platform) return true;

  const keyPlatforms = req.apiKeyPlatforms;
  if (!keyPlatforms || keyPlatforms.length === 0) return true;

  return keyPlatforms.includes(required.platform);
}

function isScopeSatisfied(
  requiredScope: string,
  storedScopes: string[],
  req: Request,
): boolean {
  const required = parseScope(requiredScope);
  if (!required) return false;

  if (!isPlatformAllowed(required, req)) return false;

  const parsedStored = parseScopes(storedScopes);

  return parsedStored.some((stored) => scopeCovers(required, stored));
}

function httpMethodToOperation(method: string): 'read' | 'write' | 'admin' {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return 'read';
  if (method === 'DELETE') return 'admin';
  return 'write';
}

export function requireScope(...requiredScopes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user && !req.user.apiKeyId) {
      next();
      return;
    }

    const storedScopes: string[] = req.apiKeyScopes ?? [];

    if (storedScopes.length === 0) {
      next(new ForbiddenError('API key has no scopes'));
      return;
    }

    for (const required of requiredScopes) {
      if (!isScopeSatisfied(required, storedScopes, req)) {
        next(
          new ForbiddenError(
            `Missing required scope "${required}". Key scopes: [${storedScopes.join(', ')}]`,
          ),
        );
        return;
      }
    }

    next();
  };
}

/** Map HTTP method → operation and enforce `{resource}:{operation}` for API keys. */
export function requireResourceAccess(resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const operation = httpMethodToOperation(req.method);
    requireScope(`${resource}:${operation}`)(req, res, next);
  };
}

export function generateValidScopes(): string[] {
  const resources = [
    'campaigns', 'ads', 'drafts', 'reports', 'audiences', 'settings',
    'notifications', 'billing', 'goals', 'exports', 'search', 'rag',
    'webhooks', 'audit-log', 'comments', 'alerts', 'agent',
  ];
  const operations = ['read', 'write', 'admin'];
  const platforms = ['meta', 'google', 'tiktok', 'snap'];

  const scopes: string[] = [];

  for (const resource of resources) {
    for (const operation of operations) {
      scopes.push(`${resource}:${operation}`);
    }
  }

  for (const platform of platforms) {
    for (const resource of resources) {
      for (const operation of operations) {
        scopes.push(`${resource}:${operation}:${platform}`);
      }
    }
  }

  return scopes;
}
