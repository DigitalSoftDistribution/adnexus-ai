import { z } from 'zod';

export const supportedPlatformSchema = z.enum(['meta', 'google', 'tiktok', 'snap']);

export const supportedOperationSchema = z.enum(['read', 'write', 'admin']);

export const supportedResourceSchema = z.enum([
  'campaigns',
  'ads',
  'drafts',
  'reports',
  'audiences',
  'settings',
  'notifications',
  'billing',
  'goals',
  'exports',
  'search',
  'rag',
  'webhooks',
  'audit-log',
  'comments',
  'alerts',
  'agent',
]);

export const scopeStringSchema = z.string().refine(
  (val) => {
    const parts = val.split(':');
    if (parts.length < 2 || parts.length > 3) return false;

    const [resource, operation, platform] = parts;

    const validResources = supportedResourceSchema.options as readonly string[];
    if (!validResources.includes(resource)) return false;

    const validOperations = supportedOperationSchema.options as readonly string[];
    if (!validOperations.includes(operation)) return false;

    if (platform) {
      const validPlatforms = supportedPlatformSchema.options as readonly string[];
      if (!validPlatforms.includes(platform)) return false;
    }

    return true;
  },
  { message: 'Invalid scope format. Use: resource:operation[:platform] (e.g., campaigns:read, reports:read:meta)' },
);

export const scopesArraySchema = z
  .array(scopeStringSchema)
  .min(1, 'At least one scope is required');

export const platformsArraySchema = z
  .array(supportedPlatformSchema)
  .min(1, 'At least one platform is required')
  .max(4, 'Invalid platforms');

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  scopes: scopesArraySchema,
  platforms: platformsArraySchema,
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  scopes: scopesArraySchema.optional(),
  platforms: platformsArraySchema.optional(),
});

export const apiKeyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.string()),
  platforms: z.array(z.string()),
  status: z.enum(['active', 'revoked']),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  callsToday: z.number(),
  callsThisMonth: z.number(),
});

export type SupportedPlatform = z.infer<typeof supportedPlatformSchema>;
export type SupportedOperation = z.infer<typeof supportedOperationSchema>;
export type SupportedResource = z.infer<typeof supportedResourceSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;
