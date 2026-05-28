import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  BarChart3,
  Clock,
  Activity,
  Search,
  ChevronRight,
  Lock,
  Unlock,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/useToast';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  callsToday: number;
  callsThisMonth: number;
}

interface CreateKeyResponse {
  key: ApiKey;
  fullKey: string;
}

interface UsageStats {
  totalCallsToday: number;
  totalCallsThisMonth: number;
  activeKeys: number;
  revokedKeys: number;
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA (for demo / offline mode)                                */
/* ------------------------------------------------------------------ */

const MOCK_KEYS: ApiKey[] = [
  {
    id: 'ak_01',
    name: 'Production Integration',
    prefix: 'ak_live_...X8f2',
    scopes: ['read', 'write'],
    status: 'active',
    createdAt: '2026-01-15T10:30:00Z',
    lastUsedAt: '2026-04-02T14:22:00Z',
    expiresAt: null,
    callsToday: 1243,
    callsThisMonth: 28941,
  },
  {
    id: 'ak_02',
    name: 'Analytics Dashboard',
    prefix: 'ak_live_...A3b9',
    scopes: ['read'],
    status: 'active',
    createdAt: '2026-02-20T08:15:00Z',
    lastUsedAt: '2026-04-02T16:45:00Z',
    expiresAt: null,
    callsToday: 892,
    callsThisMonth: 18456,
  },
  {
    id: 'ak_03',
    name: 'Admin Automation',
    prefix: 'ak_live_...K7m1',
    scopes: ['read', 'write', 'admin'],
    status: 'active',
    createdAt: '2026-03-01T12:00:00Z',
    lastUsedAt: '2026-04-01T09:10:00Z',
    expiresAt: '2026-07-01T00:00:00Z',
    callsToday: 345,
    callsThisMonth: 8234,
  },
  {
    id: 'ak_04',
    name: 'Legacy Mobile App',
    prefix: 'ak_test_...P2q5',
    scopes: ['read'],
    status: 'revoked',
    createdAt: '2025-11-10T09:00:00Z',
    lastUsedAt: '2026-03-15T11:30:00Z',
    expiresAt: null,
    callsToday: 0,
    callsThisMonth: 120,
  },
  {
    id: 'ak_05',
    name: 'Reporting Service',
    prefix: 'ak_live_...Z4w8',
    scopes: ['read', 'write'],
    status: 'active',
    createdAt: '2026-03-10T15:45:00Z',
    lastUsedAt: '2026-04-02T12:00:00Z',
    expiresAt: null,
    callsToday: 567,
    callsThisMonth: 11200,
  },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function isDemoMode(): boolean {
  return !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function generatePrefix(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ak_live_...${suffix}`;
}

function generateFullKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'ak_live_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/* ------------------------------------------------------------------ */
/*  SCOPE BADGE COMPONENT                                              */
/* ------------------------------------------------------------------ */

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = {
    read: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    write: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[scope] || colors.read}`}>
      {scope}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function ApiKeys() {
  /* -- state -- */
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read']);
  const [creating, setCreating] = useState(false);

  // New key reveal
  const [newKeyReveal, setNewKeyReveal] = useState<CreateKeyResponse | null>(null);
  const [copiedFullKey, setCopiedFullKey] = useState(false);

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Usage stats
  const [stats, setStats] = useState<UsageStats>({
    totalCallsToday: 0,
    totalCallsThisMonth: 0,
    activeKeys: 0,
    revokedKeys: 0,
  });

  /* -- fetch -- */
  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 400));
        setKeys([...MOCK_KEYS]);
        computeStats([...MOCK_KEYS]);
      } else {
        const data = await apiGet<ApiKey[]>('/api-keys');
        setKeys(data);
        computeStats(data);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load API keys',
        variant: 'destructive',
      });
      setKeys([...MOCK_KEYS]);
      computeStats([...MOCK_KEYS]);
    } finally {
      setLoading(false);
    }
  }, []);

  function computeStats(keyList: ApiKey[]) {
    const activeKeys = keyList.filter((k) => k.status === 'active').length;
    const revokedKeys = keyList.filter((k) => k.status === 'revoked').length;
    const totalCallsToday = keyList.reduce((sum, k) => sum + (k.callsToday || 0), 0);
    const totalCallsThisMonth = keyList.reduce((sum, k) => sum + (k.callsThisMonth || 0), 0);
    setStats({ activeKeys, revokedKeys, totalCallsToday, totalCallsThisMonth });
  }

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  /* -- filtered keys -- */
  const filteredKeys = keys.filter((k) => {
    const matchesSearch =
      !searchQuery ||
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.prefix.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = !showActiveOnly || k.status === 'active';
    return matchesSearch && matchesActive;
  });

  /* -- create key -- */
  async function handleCreateKey() {
    if (!newKeyName.trim()) {
      toast({ title: 'Name required', description: 'Please enter a name for the API key', variant: 'destructive' });
      return;
    }
    if (newKeyScopes.length === 0) {
      toast({ title: 'Scopes required', description: 'Select at least one scope', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 600));
        const fullKey = generateFullKey();
        const newKey: ApiKey = {
          id: `ak_${Date.now()}`,
          name: newKeyName.trim(),
          prefix: generatePrefix(),
          scopes: [...newKeyScopes],
          status: 'active',
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          expiresAt: null,
          callsToday: 0,
          callsThisMonth: 0,
        };
        setKeys((prev) => [newKey, ...prev]);
        setNewKeyReveal({ key: newKey, fullKey });
        computeStats([newKey, ...keys]);
      } else {
        const response = await apiPost<CreateKeyResponse>('/api-keys', {
          name: newKeyName.trim(),
          scopes: newKeyScopes,
        });
        setKeys((prev) => [response.key, ...prev]);
        setNewKeyReveal(response);
        computeStats([response.key, ...keys]);
      }
      setShowCreate(false);
      setNewKeyName('');
      setNewKeyScopes(['read']);
      toast({ title: 'API Key created', description: 'Your new key is ready. Copy it now — you won\'t see it again!' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }

  /* -- revoke key -- */
  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 400));
        setKeys((prev) =>
          prev.map((k) => (k.id === revokeTarget.id ? { ...k, status: 'revoked' as const } : k))
        );
        computeStats(keys.map((k) => (k.id === revokeTarget.id ? { ...k, status: 'revoked' as const } : k)));
      } else {
        await apiDelete(`/api-keys/${revokeTarget.id}`);
        setKeys((prev) =>
          prev.map((k) => (k.id === revokeTarget.id ? { ...k, status: 'revoked' as const } : k))
        );
      }
      toast({ title: 'Key revoked', description: `"${revokeTarget.name}" has been revoked and can no longer be used.` });
      setRevokeTarget(null);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to revoke key',
        variant: 'destructive',
      });
    } finally {
      setRevoking(false);
    }
  }

  /* -- copy helpers -- */
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied to clipboard' });
    });
  }

  function copyFullKey() {
    if (newKeyReveal?.fullKey) {
      copyToClipboard(newKeyReveal.fullKey);
      setCopiedFullKey(true);
      setTimeout(() => setCopiedFullKey(false), 2000);
    }
  }

  /* -- toggle scope -- */
  function toggleScope(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  /* -- render -- */
  return (
    <>
    <SEO
      title="API Keys"
      description="Manage your AdNexus AI API keys. Create, revoke, and monitor API access for secure integrations and automation."
      keywords="API keys, API access, developer tools, secure integration"
      noindex
    />
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/20">
              <Key className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
              <p className="text-sm text-slate-400">Manage API keys for programmatic access to your workspace</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={<Activity className="w-4 h-4 text-emerald-400" />}
            label="Calls Today"
            value={stats.totalCallsToday.toLocaleString()}
            accent="emerald"
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
            label="Calls This Month"
            value={stats.totalCallsThisMonth.toLocaleString()}
            accent="blue"
          />
          <StatCard
            icon={<Shield className="w-4 h-4 text-violet-400" />}
            label="Active Keys"
            value={stats.activeKeys.toString()}
            accent="violet"
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
            label="Revoked Keys"
            value={stats.revokedKeys.toString()}
            accent="amber"
          />
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#13131f] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-violet-500/50"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer whitespace-nowrap">
              <Switch
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
                className="data-[state=checked]:bg-violet-500"
              />
              Active only
            </label>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Key
          </Button>
        </motion.div>

        {/* Keys List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
              <span className="ml-3 text-slate-400">Loading API keys...</span>
            </div>
          ) : filteredKeys.length === 0 ? (
            <EmptyState onCreate={() => setShowCreate(true)} />
          ) : (
            <div className="space-y-3">
              {filteredKeys.map((key, idx) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                >
                  <KeyCard
                    apiKey={key}
                    onRevoke={() => setRevokeTarget(key)}
                    onCopyPrefix={() => copyToClipboard(key.prefix)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Security Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 rounded-xl bg-[#13131f] border border-slate-700/30 flex items-start gap-3"
        >
          <Shield className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-200">Security Best Practices</p>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-slate-600" />
                Store API keys in environment variables, never in client-side code
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-slate-600" />
                Use the minimum required scopes — prefer read-only when possible
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-slate-600" />
                Rotate keys regularly and revoke unused keys immediately
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      {/* ── Create Key Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#13131f] border-slate-700/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-violet-400" />
              Create API Key
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new API key for programmatic access. You will only see the full key once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Key Name</label>
              <Input
                placeholder="e.g., Production Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-[#0a0a0f] border-slate-700/50 text-white placeholder:text-slate-600 focus:border-violet-500/50"
                autoFocus
              />
              <p className="mt-1 text-xs text-slate-500">A descriptive name to identify this key</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Scopes</label>
              <div className="space-y-2">
                <ScopeCheckbox
                  scope="read"
                  label="Read"
                  description="Read campaign data, reports, and analytics"
                  checked={newKeyScopes.includes('read')}
                  onToggle={() => toggleScope('read')}
                  icon={<Eye className="w-4 h-4 text-blue-400" />}
                />
                <ScopeCheckbox
                  scope="write"
                  label="Write"
                  description="Create and modify campaigns, drafts, and settings"
                  checked={newKeyScopes.includes('write')}
                  onToggle={() => toggleScope('write')}
                  icon={<Unlock className="w-4 h-4 text-emerald-400" />}
                />
                <ScopeCheckbox
                  scope="admin"
                  label="Admin"
                  description="Manage team, billing, workspace settings"
                  checked={newKeyScopes.includes('admin')}
                  onToggle={() => toggleScope('admin')}
                  icon={<Zap className="w-4 h-4 text-amber-400" />}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="border-slate-700/50 text-slate-300 hover:bg-slate-800/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Key Reveal Dialog ── */}
      <Dialog open={!!newKeyReveal} onOpenChange={() => setNewKeyReveal(null)}>
        <DialogContent className="bg-[#13131f] border-slate-700/50 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Check className="w-5 h-5" />
              API Key Created
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Copy your API key now. For security reasons, it will never be shown again.
            </DialogDescription>
          </DialogHeader>

          {newKeyReveal && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-[#0a0a0f] border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">Copy this key now</span>
                </div>
                <p className="text-xs text-amber-300/70">
                  This is the only time you will see the full key. Store it securely in your environment variables.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Your API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 rounded-lg bg-[#0a0a0f] border border-slate-700/50 text-sm font-mono text-emerald-400 break-all">
                    {newKeyReveal.fullKey}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyFullKey}
                    className="shrink-0 border-slate-700/50 hover:bg-slate-800/50"
                  >
                    {copiedFullKey ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  {newKeyReveal.key.name}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {newKeyReveal.key.scopes.join(', ')}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                setNewKeyReveal(null);
                copyFullKey();
              }}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0"
            >
              <Check className="w-4 h-4 mr-1.5" />
              I&apos;ve Copied My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirmation Dialog ── */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent className="bg-[#13131f] border-slate-700/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Revoke API Key
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to revoke <strong className="text-slate-200">{revokeTarget?.name}</strong>?
              This action cannot be undone. Any integrations using this key will immediately stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700/50 text-slate-300 hover:bg-slate-800/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {revoking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Revoke Key
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  const borderColors: Record<string, string> = {
    emerald: 'border-emerald-500/10',
    blue: 'border-blue-500/10',
    violet: 'border-violet-500/10',
    amber: 'border-amber-500/10',
  };
  return (
    <div className={`p-4 rounded-xl bg-[#13131f] border ${borderColors[accent] || borderColors.violet}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function KeyCard({
  apiKey,
  onRevoke,
  onCopyPrefix,
}: {
  apiKey: ApiKey;
  onRevoke: () => void;
  onCopyPrefix: () => void;
}) {
  const isActive = apiKey.status === 'active';

  return (
    <div
      className={`p-4 rounded-xl bg-[#13131f] border transition-all duration-200 ${
        isActive
          ? 'border-slate-700/30 hover:border-slate-600/50'
          : 'border-slate-800/30 opacity-60'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Key info */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isActive
                ? 'bg-violet-500/10 border border-violet-500/20'
                : 'bg-slate-800/50 border border-slate-700/20'
            }`}
          >
            <Key className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-white truncate">{apiKey.name}</span>
              <Badge
                variant="outline"
                className={`text-xs ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                {apiKey.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-slate-500 font-mono">{apiKey.prefix}</code>
              <button
                onClick={onCopyPrefix}
                className="text-slate-600 hover:text-slate-400 transition-colors"
                title="Copy prefix"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {apiKey.scopes.map((scope) => (
                <ScopeBadge key={scope} scope={scope} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Meta + Actions */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-500 shrink-0 flex-wrap">
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {formatRelative(apiKey.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Last used {formatRelative(apiKey.lastUsedAt)}
            </span>
            {apiKey.expiresAt && (
              <span className="flex items-center gap-1 text-amber-400/70">
                <AlertTriangle className="w-3 h-3" />
                Expires {formatRelative(apiKey.expiresAt)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-slate-400 font-medium">{apiKey.callsToday.toLocaleString()} today</span>
            <span className="text-slate-600">{apiKey.callsThisMonth.toLocaleString()}/mo</span>
          </div>

          {isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRevoke}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Revoke
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ScopeCheckbox({
  scope,
  label,
  description,
  checked,
  onToggle,
  icon,
}: {
  scope: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
        checked
          ? 'border-violet-500/30 bg-violet-500/5'
          : 'border-slate-700/30 bg-transparent hover:bg-slate-800/30'
      }`}
    >
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5 data-[state=checked]:bg-violet-500"
      />
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{icon}</div>
        <div>
          <span className="text-sm font-medium text-slate-200">{label}</span>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
    </label>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1a2e] border border-slate-700/30 flex items-center justify-center mb-4">
        <Key className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-1">No API keys yet</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        Create your first API key to start integrating with the AdNexus platform programmatically.
      </p>
      <Button
        onClick={onCreate}
        className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Create Your First Key
      </Button>
    </div>
  );
}
