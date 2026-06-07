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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type InvitableTeamRole = 'admin' | 'editor' | 'viewer';

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

function useSettings() {
  const queryClient = useQueryClient();
  const t = useTranslations('settings');

  const workspace = useQuery({
    queryKey: ['settings', 'workspace'],
    queryFn: async (): Promise<Workspace> => {
      const res = await fetch('/api/v2/settings/workspace');
      if (!res.ok) throw new Error(t('failedToFetchWorkspace'));
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
      if (!res.ok) throw new Error(t('failedToUpdateWorkspace'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'workspace'] }),
  });

  const team = useQuery({
    queryKey: ['settings', 'team'],
    queryFn: async (): Promise<TeamMember[]> => {
      const res = await fetch('/api/v2/settings/team');
      if (!res.ok) throw new Error(t('failedToFetchTeam'));
      const data = await res.json();
      return data.data;
    },
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: InvitableTeamRole }) => {
      const res = await fetch('/api/v2/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? t('failedToInviteMember'));
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/v2/settings/team/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(t('failedToUpdateRole'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v2/settings/team/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('failedToRemoveMember'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  });

  const integrations = useQuery({
    queryKey: ['settings', 'integrations'],
    queryFn: async (): Promise<Integration[]> => {
      const res = await fetch('/api/v2/settings/integrations');
      if (!res.ok) throw new Error(t('failedToFetchIntegrations'));
      const data = await res.json();
      return data.data;
    },
  });

  const notifications = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: async (): Promise<NotificationPrefs> => {
      const res = await fetch('/api/v2/settings/notifications');
      if (!res.ok) throw new Error(t('failedToFetchNotifications'));
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
      if (!res.ok) throw new Error(t('failedToUpdateNotifications'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] }),
  });

  const apiKeys = useQuery({
    queryKey: ['settings', 'api-keys'],
    queryFn: async (): Promise<ApiKey[]> => {
      const res = await fetch('/api/v2/settings/api-keys');
      if (!res.ok) throw new Error(t('failedToFetchApiKeys'));
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
      if (!res.ok) throw new Error(t('failedToCreateApiKey'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  });

  const revokeApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await fetch(`/api/v2/settings/api-keys/${keyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('failedToRevokeApiKey'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  });

  return {
    workspace, updateWorkspace,
    team, inviteMember, updateMemberRole, removeMember,
    integrations,
    notifications, updateNotifications,
    apiKeys, createApiKey, revokeApiKey,
  };
}

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState('workspace');
  const {
    workspace, updateWorkspace,
    team, inviteMember, updateMemberRole, removeMember,
    integrations,
    notifications, updateNotifications,
    apiKeys, createApiKey, revokeApiKey,
  } = useSettings();
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  const [editWorkspace, setEditWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitableTeamRole>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

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

  const handleInviteMember = () => {
    const email = inviteEmail.trim();
    if (!email) return;

    setInviteError(null);
    setInviteSuccess(null);
    inviteMember.mutate(
      { email, role: inviteRole },
      {
        onSuccess: () => {
          setInviteSuccess(t('inviteSuccess'));
          setInviteEmail('');
          setInviteRole('viewer');
        },
        onError: (error) => {
          setInviteError(error instanceof Error ? error.message : t('failedToInviteMember'));
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Dialog open={inviteOpen} onOpenChange={(open) => {
        setInviteOpen(open);
        if (!open) {
          setInviteError(null);
          setInviteSuccess(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inviteMember')}</DialogTitle>
            <DialogDescription>{t('inviteDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-invite-email">{t('inviteEmail')}</Label>
              <Input
                id="team-invite-email"
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                disabled={inviteMember.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-invite-role">{t('inviteRole')}</Label>
              <select
                id="team-invite-role"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as InvitableTeamRole)}
                disabled={inviteMember.isPending}
              >
                <option value="viewer">{t('roles.viewer')}</option>
                <option value="editor">{t('roles.editor')}</option>
                <option value="admin">{t('roles.admin')}</option>
              </select>
            </div>
            {inviteError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {inviteError}
              </div>
            ) : null}
            {inviteSuccess ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {inviteSuccess}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteMember.isPending}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleInviteMember} disabled={inviteMember.isPending || !inviteEmail.trim()}>
              {inviteMember.isPending ? tc('processing') : tc('invite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t('workspaceName')}</Label>
                    {editWorkspace ? (
                      <div className="flex gap-2">
                        <Input
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          disabled={updateWorkspace.isPending}
                        />
                        <Button onClick={handleSaveWorkspace} disabled={updateWorkspace.isPending || !workspaceName.trim()}>
                          <Save className="mr-2 h-4 w-4" />
                          {updateWorkspace.isPending ? tc('saving') : tc('save')}
                        </Button>
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
              <Button size="sm" onClick={() => setInviteOpen(true)}>
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
                  {(updateMemberRole.isError || removeMember.isError) && (
                    <InlineError message={(updateMemberRole.error as Error)?.message || (removeMember.error as Error)?.message || t('failedToUpdateRole')} />
                  )}
                  {(team.data ?? []).map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
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
                          className="h-8 rounded-md border px-2 text-sm"
                          value={member.role}
                          onChange={(e) => updateMemberRole.mutate({ userId: member.userId, role: e.target.value })}
                          disabled={updateMemberRole.isPending || member.role === 'owner'}
                        >
                          <option value="viewer">{t('roles.viewer')}</option>
                          <option value="editor">{t('roles.editor')}</option>
                          <option value="admin">{t('roles.admin')}</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember.mutate(member.userId)}
                          disabled={removeMember.isPending || member.role === 'owner'}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.isLoading ? (
              <div className="col-span-2 flex h-32 items-center justify-center"><LoadingSpinner size="md" /></div>
            ) : (integrations.data ?? []).length === 0 ? (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                {t('noIntegrations')}
              </div>
            ) : (
              (integrations.data ?? []).map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary uppercase">
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
              ) : (
                <>
                  <NotificationToggle
                    title={t('campaignAlerts')}
                    description={t('campaignAlertsDesc')}
                    checked={notifications.data?.email.campaignAlerts ?? true}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true };
                      updateNotifications.mutate({ email: { ...email, campaignAlerts: v } });
                    }}
                  />
                  <NotificationToggle
                    title={t('aiRecommendations')}
                    description={t('aiRecommendationsDesc')}
                    checked={notifications.data?.inApp.aiRecommendations ?? true}
                    onChange={(v) => {
                      const inApp = notifications.data?.inApp ?? { campaignAlerts: true, budgetAlerts: true, aiRecommendations: true, teamActivity: true };
                      updateNotifications.mutate({ inApp: { ...inApp, aiRecommendations: v } });
                    }}
                  />
                  <NotificationToggle
                    title={t('weeklySummary')}
                    description={t('weeklySummaryDesc')}
                    checked={notifications.data?.email.weeklyReport ?? true}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true };
                      updateNotifications.mutate({ email: { ...email, weeklyReport: v } });
                    }}
                  />
                  <NotificationToggle
                    title={t('teamActivity')}
                    description={t('teamActivityDesc')}
                    checked={notifications.data?.email.teamActivity ?? true}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true };
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('apiKeys')}</CardTitle>
                <CardDescription>{t('apiKeysDescription')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t('keyName')}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-48"
                />
                <Button size="sm" onClick={handleCreateKey} disabled={createApiKey.isPending || !newKeyName.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {tc('generate')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewKey && (
                <div className="mb-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-2 text-emerald-900">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-none" />
                    <div>
                      <p className="text-sm font-medium">{t('newApiKey')}</p>
                      <p className="text-sm">{t('copyApiKeyWarning')}</p>
                    </div>
                  </div>
                  <code className="block overflow-x-auto rounded bg-white p-2 font-mono text-sm">{showNewKey}</code>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyKey}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copyState === 'copied' ? t('copied') : t('copy')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewKey(null)}>{tc('dismiss')}</Button>
                    {copyState === 'failed' && <p className="text-sm text-red-700">{t('copyFailed')}</p>}
                  </div>
                </div>
              )}
              {createApiKey.isError && <InlineError message={(createApiKey.error as Error)?.message ?? t('failedToCreateApiKey')} />}
              {revokeApiKey.isError && <InlineError message={(revokeApiKey.error as Error)?.message ?? t('failedToRevokeApiKey')} />}
              {apiKeys.isLoading ? (
                <div className="flex h-32 items-center justify-center"><LoadingSpinner size="md" /></div>
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
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeApiKey.mutate(key.id)}
                        disabled={revokeApiKey.isPending}
                        aria-label={t('revokeApiKey')}
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
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
      <span>{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mb-4 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}
