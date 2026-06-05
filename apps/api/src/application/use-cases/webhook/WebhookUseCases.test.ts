import { describe, it, expect, vi } from 'vitest';
import { ListWebhookConfigsUseCase } from './ListWebhookConfigsUseCase';
import { CreateWebhookConfigUseCase } from './CreateWebhookConfigUseCase';
import type { IWebhookRepository } from '../../../domain/repositories/IWebhookRepository';
import type { WebhookConfig } from '../../../domain/entities/WebhookConfig';

const config: WebhookConfig = {
  id: 'wh-1',
  workspaceId: 'ws-1',
  name: 'Slack notifier',
  url: 'https://hooks.example.com/abc',
  secret: null,
  events: ['campaign.created'],
  status: 'active',
  lastTriggeredAt: null,
  failureCount: 0,
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IWebhookRepository> = {}): IWebhookRepository =>
  ({
    listConfigs: vi.fn().mockResolvedValue([config]),
    findConfigById: vi.fn(),
    createConfig: vi.fn().mockResolvedValue(config),
    updateConfig: vi.fn(),
    deleteConfig: vi.fn(),
    listDeliveries: vi.fn(),
    ...overrides,
  }) as IWebhookRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListWebhookConfigsUseCase', () => {
  it('lists webhook configs for a viewer', async () => {
    const res = await new ListWebhookConfigsUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toHaveLength(1);
  });

  it('denies an unknown role (403)', async () => {
    const res = await new ListWebhookConfigsUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'nope' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});

describe('CreateWebhookConfigUseCase', () => {
  const base = {
    workspaceId: 'ws-1', userRole: 'admin', name: 'Slack notifier',
    url: 'https://hooks.example.com/abc', events: ['campaign.created'],
  };

  it('creates a config for an admin with active defaults', async () => {
    const repo = makeRepo();
    const res = await new CreateWebhookConfigUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', failureCount: 0, secret: null, lastTriggeredAt: null }),
    );
  });

  it('denies an editor (403) — webhooks are owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new CreateWebhookConfigUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.createConfig).not.toHaveBeenCalled();
  });

  it('denies a viewer (403)', async () => {
    const res = await new CreateWebhookConfigUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('rejects a blank name (400)', async () => {
    const res = await new CreateWebhookConfigUseCase(makeRepo()).execute({ ...base, name: '  ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });

  it('rejects a blank url (400)', async () => {
    const res = await new CreateWebhookConfigUseCase(makeRepo()).execute({ ...base, url: '' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });

  it('trims name and url before persisting', async () => {
    const repo = makeRepo();
    await new CreateWebhookConfigUseCase(repo).execute({ ...base, name: '  Hook  ', url: '  https://x.io  ' });
    expect(repo.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hook', url: 'https://x.io' }),
    );
  });
});
