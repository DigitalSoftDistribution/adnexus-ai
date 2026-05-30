'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Users, Key, Bell, Webhook, Save, Plus, Trash2 } from 'lucide-react';

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

function useSettings() {
  const queryClient = useQueryClient();

  const workspace = useQuery({
    queryKey: ['settings', 'workspace'],
    queryFn: async (): Promise<Workspace> => {
      const res = await fetch('/api/v2/settings/workspace');
      if (!res.ok) throw new Error('Failed to fetch workspace');
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
      if (!res.ok) throw new Error('Failed to update workspace');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'workspace'] }),
  });

  const team = useQuery({
    queryKey: ['settings', 'team'],
    queryFn: async (): Promise<TeamMember[]> => {
      const res = await fetch('/api/v2/settings/team');
      if (!res.ok) throw new Error('Failed to fetch team');
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
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v2/settings/team/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove member');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  });

  const integrations = useQuery({
    queryKey: ['settings', 'integrations'],
    queryFn: async (): Promise<Integration[]> => {
      const res = await fetch('/api/v2/settings/integrations');
      if (!res.ok) throw new Error('Failed to fetch integrations');
      const data = await res.json();
      return data.data;
    },
  });

  const notifications = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: async (): Promise<NotificationPrefs> => {
      const res = await fetch('/api/v2/settings/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
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
      if (!res.ok) throw new Error('Failed to update notifications');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] }),
  });

  const apiKeys = useQuery({
    queryKey: ['settings', 'api-keys'],
    queryFn: async (): Promise<ApiKey[]> => {
      const res = await fetch('/api/v2/settings/api-keys');
      if (!res.ok) throw new Error('Failed to fetch API keys');
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
      if (!res.ok) throw new Error('Failed to create API key');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  });

  const revokeApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await fetch(`/api/v2/settings/api-keys/${keyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke API key');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  });

  return {
    workspace, updateWorkspace,
    team, updateMemberRole, removeMember,
    integrations,
    notifications, updateNotifications,
    apiKeys, createApiKey, revokeApiKey,
  };
}

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState('workspace');
  const {
    workspace, updateWorkspace,
    team, updateMemberRole, removeMember,
    integrations,
    notifications, updateNotifications,
    apiKeys, createApiKey, revokeApiKey,
  } = useSettings();

  const [editWorkspace, setEditWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);

  const handleSaveWorkspace = () => {
    updateWorkspace.mutate({ name: workspaceName });
    setEditWorkspace(false);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    createApiKey.mutate(newKeyName, {
      onSuccess: (data) => {
        setShowNewKey(data.data.fullKey);
        setNewKeyName('');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage workspace, team, and preferences.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>Configure your workspace details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.isLoading ? (
                <LoadingSpinner size="md" />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Workspace Name</Label>
                    {editWorkspace ? (
                      <div className="flex gap-2">
                        <Input
                          defaultValue={workspace.data?.name}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                        />
                        <Button onClick={handleSaveWorkspace} disabled={updateWorkspace.isPending}>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="font-medium">{workspace.data?.name}</p>
                          <p className="text-sm text-muted-foreground">Slug: {workspace.data?.slug}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditWorkspace(true)}>Edit</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Plan</p>
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
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage access and permissions</CardDescription>
              </div>
              <Button size="sm">
                <Users className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              {team.isLoading ? (
                <div className="flex h-32 items-center justify-center"><LoadingSpinner size="md" /></div>
              ) : (
                <div className="space-y-2">
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
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember.mutate(member.userId)}
                          disabled={member.role === 'owner'}
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
                No integrations connected yet
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
                            {integration.status === 'connected' ? `Account: ${integration.accountName ?? integration.accountId ?? 'Connected'}` : 'Not connected'}
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
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.isLoading ? (
                <LoadingSpinner size="md" />
              ) : (
                <>
                  <NotificationToggle
                    title="Campaign Alerts"
                    description="Budget, performance, and status changes"
                    checked={notifications.data?.email.campaignAlerts ?? true}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true };
                      updateNotifications.mutate({ email: { ...email, campaignAlerts: v } });
                    }}
                  />
                  <NotificationToggle
                    title="AI Recommendations"
                    description="New recommendations from AI Agent"
                    checked={notifications.data?.inApp.aiRecommendations ?? true}
                    onChange={(v) => {
                      const inApp = notifications.data?.inApp ?? { campaignAlerts: true, budgetAlerts: true, aiRecommendations: true, teamActivity: true };
                      updateNotifications.mutate({ inApp: { ...inApp, aiRecommendations: v } });
                    }}
                  />
                  <NotificationToggle
                    title="Weekly Summary"
                    description="Weekly performance report email"
                    checked={notifications.data?.email.weeklyReport ?? true}
                    onChange={(v) => {
                      const email = notifications.data?.email ?? { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true };
                      updateNotifications.mutate({ email: { ...email, weeklyReport: v } });
                    }}
                  />
                  <NotificationToggle
                    title="Team Activity"
                    description="Member invites, role changes"
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
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API access for integrations</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Key name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-48"
                />
                <Button size="sm" onClick={handleCreateKey} disabled={createApiKey.isPending || !newKeyName.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewKey && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-800">New API Key created — copy it now:</p>
                  <code className="mt-2 block rounded bg-white p-2 text-sm font-mono">{showNewKey}</code>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowNewKey(null)}>Dismiss</Button>
                </div>
              )}
              {apiKeys.isLoading ? (
                <div className="flex h-32 items-center justify-center"><LoadingSpinner size="md" /></div>
              ) : (apiKeys.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Key}
                  title="No API keys yet"
                  description="Generate an API key to access the AdNexus API programmatically."
                />
              ) : (
                <div className="space-y-2">
                  {(apiKeys.data ?? []).map((key) => (
                    <div key={key.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-sm text-muted-foreground">{key.keyPrefix}... • Created {new Date(key.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => revokeApiKey.mutate(key.id)}>
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

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mb-4 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}
