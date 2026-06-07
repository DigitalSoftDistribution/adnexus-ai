'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Copy, Users, Key, Bell, Save, Plus, Trash2 } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  branding: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invitedBy: string | null;
  invitedAt: string | null;
  joinedAt: string;
}

interface Integration {
  id: string;
  platform: string;
  name: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  accountId: string | null;
  accountName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

interface NotificationPrefs {
  email: { campaignAlerts: boolean; budgetAlerts: boolean; dailyDigest: boolean; weeklyReport: boolean; teamActivity: boolean; productUpdates: boolean };
  inApp: { campaignAlerts: boolean; budgetAlerts: boolean; aiRecommendations: boolean; teamActivity: boolean };
  slack: { enabled: boolean; webhookUrl: string | null; channel: string | null };
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

const defaultEmailPrefs: NotificationPrefs['email'] = {
  campaignAlerts: true,
  budgetAlerts: true,
  dailyDigest: false,
  weeklyReport: true,
  teamActivity: true,
  productUpdates: true,
};

const defaultInAppPrefs: NotificationPrefs['inApp'] = {
  campaignAlerts: true,
  budgetAlerts: true,
  aiRecommendations: true,
  teamActivity: true,
};

async function parseErrorResponse(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json() as { error?: string; message?: string };
    return new Error(body.error || body.message || fallback);
  } catch {
    return new Error(fallback);
  }
}

function useSettings() {
  const queryClient = useQueryClient();
  const t = useTranslations('settings');

  const workspace = useQuery({
    queryKey: ['settings', 'workspace'],
    queryFn: async (): Promise<Workspace> => {
      const res = await fetch('/api/v2/settings/workspace');
      if (!res.ok) throw await parseErrorResponse(res, t('failedToFetchWorkspace'));
      const data = await res.json();
      return data.data;
    },
  });

  const updateWorkspace = useMutation({
    mutationFn: async (updates: Partial<Workspace>) => {
      const res = await fetch('/api/v2/settings/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw await parseErrorResponse(res, t('failedToUpdateWorkspace'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'workspace'] }),
  });

  const team = useQuery({
    queryKey: ['settings', 'team'],
    queryFn: async (): Promise<TeamMember[]> => {
      const res = await fetch('/api/v2/settings/team');
      if (!res.ok) throw await parseErrorResponse(res, t('failedToFetchTeam'));
      const data = await res.json();
      return data.data;
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/v2/settings/team/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw await parseErrorResponse(res, t('failedToUpdateRole'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v2/settings/team/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw await parseErrorResponse(res, t('failedToRemoveMember'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  });

  const integrations = useQuery({
    queryKey: ['settings', 'integrations'],
    queryFn: async (): Promise<Integration[]> => {
      const res = await fetch('/api/v2/settings/integrations');
      if (!res.ok) throw await parseErrorResponse(res, t('failedToFetchIntegrations'));
      const data = await res.json();
      return data.data;
    },
  });

  const notifications = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: async (): Promise<NotificationPrefs> => {
      const res = await fetch('/api/v2/settings/notifications');
      if (!res.ok) throw await parseErrorResponse(res, t('failedToFetchNotifications'));
      const data = await res.json();
      return data.data;
    },
  });

  const updateNotifications = useMutation({
    mutationFn: async (prefs: Partial<NotificationPrefs>) => {
      const res = await fetch('/api/v2/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw await parseErrorResponse(res, t('failedToUpdateNotifications'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] }),
  });

  const apiKeys = useQuery({
    queryKey: ['settings', 'api-keys'],
    queryFn: async (): Promise<ApiKey[]> => {
      const res = await fetch('/api/v2/settings/api-keys');
      if (!res.ok) throw await parseErrorResponse(res, t('failedToFetchApiKeys'));
      const data = await res.json();
      return data.data;
    },
  });

  const createApiKey = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/v2/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw await parseErrorResponse(res, t('failedToCreateApiKey'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  });

  const revokeApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await fetch(`/api/v2/settings/api-keys/${keyId}`, { method: 'DELETE' });
      if (!res.ok) throw await parseErrorResponse(res, t('failedToRevokeApiKey'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  });

  return {
    workspace,
    updateWorkspace,
    team,
    updateMemberRole,
    removeMember,
    integrations,
    notifications,
    updateNotifications,
    apiKeys,
    createApiKey,
    revokeApiKey,
  };
}

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState('workspace');
  const {
    workspace,
    updateWorkspace,
    team,
    updateMemberRole,
    removeMember,
    integrations,
    notifications,
    updateNotifications,
    apiKeys,
    createApiKey,
    revokeApiKey,
  } = useSettings();
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  const [editWorkspace, setEditWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleStartEditWorkspace = () => {
    setWorkspaceName(workspace.data?.name ?? '');
    setEditWorkspace(true);
  };

  const handleSaveWorkspace = () => {
    const nextName = workspaceName.trim();
    if (!nextName) return;

    updateWorkspace.mutate({ name: nextName }, {
      onSuccess: () => setEditWorkspace(false),
    });
  };

  const handleCreateKey = () => {
    const name = newKeyName.trim();
    if (!name) return;

    createApiKey.mutate(name, {
      onSuccess: (data) => {
        setShowNewKey(data.data.fullKey);
        setNewKeyName('');
        setCopyState('idle');
      },
    });
  };

  const handleCopyKey = async () => {
    if (!showNewKey || !navigator.clipboard) {
      setCopyState('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(showNewKey);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="workspace">{t('tabs.workspace')}</TabsTrigger>
          <TabsTrigger value="team">{t('tabs.team')}</TabsTrigger>
          <TabsTrigger value="integrations">{t('tabs.integrations')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="api">{t('tabs.apiKeys')}</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('workspaceSettings')}</CardTitle>
              <CardDescription>{t('workspaceDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.isLoading ? (
                <LoadingSpinner size="md" />
              ) : workspace.isError ? (
                <ErrorState
                  title={tc('error')}
                  description={(workspace.error as Error)?.message ?? t('failedToFetchWorkspace')}
                  onRetry={() => workspace.refetch()}
                  retryLabel={tc('retry')}
                />
              ) : (
                <>
                  {updateWorkspace.isError && (
                    <InlineError message={(updateWorkspace.error as Error)?.message ?? t('failedToUpdateWorkspace')} />
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="workspace-name">{t('workspaceName')}</Label>
                    {editWorkspace ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="workspace-name"
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveWorkspace} disabled={updateWorkspace.isPending || !workspaceName.trim()}>
                            <Save className="mr-2 h-4 w-4" />
                            {updateWorkspace.isPending ? tc('saving') : tc('save')}
                          </Button>
                          <Button variant="outline" onClick={() => setEditWorkspace(false)} disabled={updateWorkspace.isPending}>
                            {tc('cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="font-medium">{workspace.data?.name}</p>
                          <p className="text-sm text-muted-foreground">{t('slug')}: {workspace.data?.slug}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleStartEditWorkspace}>{tc('edit')}</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{t('plan')}</p>
                      <p className="text-sm text-muted-foreground capitalize">{workspace.data?.plan}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{workspace.data?.plan}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('teamMembers')}</CardTitle>
                <CardDescription>{t('teamDescription')}</CardDescription>
              </div>
              <Button size="sm" variant="outline" disabled title={t('inviteUnavailable')}>
                <Users className="mr-2 h-4 w-4" />
                {t('inviteMember')}
              </Button>
            </CardHeader>
            <CardContent>
              {team.isLoading ? (
                <div className="flex h-32 items-center justify-center"><LoadingSpinner size="md" /></div>
              ) : team.isError ? (
                <ErrorState
                  title={tc('error')}
                  description={(team.error as Error)?.message ?? t('failedToFetchTeam')}
                  onRetry={() => team.refetch()}
                  retryLabel={tc('retry')}
                />
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                    {t('inviteUnavailable')}
                  </div>
                  {(updateMemberRole.isError || removeMember.isError) && (
                    <InlineError message={(updateMemberRole.error as Error)?.message || (removeMember.error as Error)?.message || t('failedToUpdateRole')} />
                  )}
                  {(team.data ?? []).map((member) => {
                    const memberMutationPending = updateMemberRole.isPending || removeMember.isPending;
                    return (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                            {member.name?.charAt(0) ?? member.email.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{member.name ?? member.email}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{member.role}</Badge>
                          <select
                            className="h-8 rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                            value={member.role}
                            disabled={member.role === 'owner' || memberMutationPending}
                            onChange={(e) => updateMemberRole.mutate({ userId: member.userId, role: e.target.value })}
                            aria-label={`${t('roles.admin')} role for ${member.email}`}
                          >
                            {member.role === 'owner' && <option value="owner">{t('roles.owner')}</option>}
                            <option value="viewer">{t('roles.viewer')}</option>
                            <option value="editor">{t('roles.editor')}</option>
                            <option value="admin">{t('roles.admin')}</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember.mutate(member.userId)}
                            disabled={member.role === 'owner' || memberMutationPending}
                            aria-label={`${tc('delete')} ${member.email}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          {integrations.isLoading ? (
            <div className="flex h-32 items-center justify-center"><LoadingSpinner size="md" /></div>
          ) : integrations.isError ? (
            <ErrorState
              title={tc('error')}
              description={(integrations.error as Error)?.message ?? t('failedToFetchIntegrations')}
              onRetry={() => integrations.refetch()}
              retryLabel={tc('retry')}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(integrations.data ?? []).length === 0 ? (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  {t('noIntegrations')}
                </div>
              ) : (
                (integrations.data ?? []).map((integration) => (
                  <Card key={integration.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold uppercase text-primary">
                            {integration.platform.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{integration.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {integration.status === 'connected' ? `${t('account')}: ${integration.accountName ?? integration.accountId ?? t('connected')}` : t('notConnected')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'} className="capitalize">
                          {integration.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationPreferences')}</CardTitle>
              <CardDescription>{t('notificationDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.isLoading ? (
                <LoadingSpinner size="md" />
              ) : notifications.isError ? (
                <ErrorState
                  title={tc('error')}
                  description={(notifications.error as Error)?.message ?? t('failedToFetchNotifications')}
                  onRetry={() => notifications.refetch()}
                  retryLabel={tc('retry')}
                />
              ) : (
                <>
                  {updateNotifications.isError && (
                    <InlineError message={(updateNotifications.error as Error)?.message ?? t('failedToUpdateNotifications')} />
                  )}
                  <NotificationToggle
                    title={t('campaignAlerts')}
                    description={t('campaignAlertsDesc')}
                    checked={notifications.data?.email.campaignAlerts ?? true}
                    disabled={updateNotifications.isPending}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? defaultEmailPrefs;
                      updateNotifications.mutate({ email: { ...email, campaignAlerts: v } });
                    }}
                  />
                  <NotificationToggle
                    title={t('aiRecommendations')}
                    description={t('aiRecommendationsDesc')}
                    checked={notifications.data?.inApp.aiRecommendations ?? true}
                    disabled={updateNotifications.isPending}
                    onChange={(v) => {
                      const inApp = notifications.data?.inApp ?? defaultInAppPrefs;
                      updateNotifications.mutate({ inApp: { ...inApp, aiRecommendations: v } });
                    }}
                  />
                  <NotificationToggle
                    title={t('weeklySummary')}
                    description={t('weeklySummaryDesc')}
                    checked={notifications.data?.email.weeklyReport ?? true}
                    disabled={updateNotifications.isPending}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? defaultEmailPrefs;
                      updateNotifications.mutate({ email: { ...email, weeklyReport: v } });
                    }}
                  />
                  <NotificationToggle
                    title={t('teamActivity')}
                    description={t('teamActivityDesc')}
                    checked={notifications.data?.email.teamActivity ?? true}
                    disabled={updateNotifications.isPending}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? defaultEmailPrefs;
                      updateNotifications.mutate({ email: { ...email, teamActivity: v } });
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{t('apiKeys')}</CardTitle>
                <CardDescription>{t('apiKeysDescription')}</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder={t('keyName')}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full sm:w-48"
                  aria-label={t('keyName')}
                />
                <Button size="sm" onClick={handleCreateKey} disabled={createApiKey.isPending || !newKeyName.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {createApiKey.isPending ? tc('creating') : tc('generate')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewKey && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium">{t('newApiKey')}</p>
                      <p className="text-xs text-emerald-800">{t('copyApiKeyWarning')}</p>
                    </div>
                  </div>
                  <code className="mt-3 block overflow-x-auto rounded bg-white p-2 font-mono text-sm">{showNewKey}</code>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyKey}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copyState === 'copied' ? t('copied') : t('copy')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowNewKey(null)}>{tc('dismiss')}</Button>
                    {copyState === 'failed' && <span className="self-center text-xs text-red-700">{t('copyFailed')}</span>}
                  </div>
                </div>
              )}
              {createApiKey.isError && (
                <InlineError message={(createApiKey.error as Error)?.message ?? t('failedToCreateApiKey')} />
              )}
              {revokeApiKey.isError && (
                <InlineError message={(revokeApiKey.error as Error)?.message ?? t('failedToRevokeApiKey')} />
              )}
              {apiKeys.isLoading ? (
                <div className="flex h-32 items-center justify-center"><LoadingSpinner size="md" /></div>
              ) : apiKeys.isError ? (
                <ErrorState
                  title={tc('error')}
                  description={(apiKeys.error as Error)?.message ?? t('failedToFetchApiKeys')}
                  onRetry={() => apiKeys.refetch()}
                  retryLabel={tc('retry')}
                />
              ) : (apiKeys.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Key}
                  title={t('noApiKeys')}
                  description={t('apiKeysPlaceholder')}
                />
              ) : (
                <div className="space-y-2">
                  {(apiKeys.data ?? []).map((key) => (
                    <div key={key.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-sm text-muted-foreground">{key.keyPrefix}... {tc('created')} {new Date(key.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {key.lastUsedAt ? `${t('lastUsed')}: ${new Date(key.lastUsedAt).toLocaleDateString()}` : t('neverUsed')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeApiKey.mutate(key.id)}
                        disabled={revokeApiKey.isPending}
                        aria-label={`${t('revokeApiKey')} ${key.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
          aria-label={title}
        />
        <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
      </label>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="mb-4 h-12 w-12 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
