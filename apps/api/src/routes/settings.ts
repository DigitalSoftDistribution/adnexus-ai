import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../lib/errors';
import { getRequestLogger } from '../lib/logger';

const router = Router();
const logger = (req: { headers: Record<string, string | string[] | undefined> }) =>
  getRequestLogger((req.headers['x-request-id'] as string) ?? 'settings-route');

// ═══════════════════════════════════════════════════════════════
// Zod Schemas
// ═══════════════════════════════════════════════════════════════

const updateSettingsSchema = z.object({
  workspace: z
    .object({
      name: z.string().min(1).max(255).optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  notifications: z.record(z.unknown()).optional(),
  integrations: z.record(z.unknown()).optional(),
  aiPreferences: z.record(z.unknown()).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'analyst', 'viewer']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'analyst', 'viewer']),
});

const updateNotificationsSchema = z.object({
  channels: z
    .object({
      email: z.boolean().optional(),
      slack: z.boolean().optional(),
      inApp: z.boolean().optional(),
    })
    .optional(),
  types: z
    .object({
      drafts: z.boolean().optional(),
      alerts: z.boolean().optional(),
      reports: z.boolean().optional(),
      aiActions: z.boolean().optional(),
    })
    .optional(),
});

const updateAIPreferencesSchema = z.object({
  confidenceThreshold: z.number().min(0).max(1).optional(),
  autoExecuteLowRisk: z.boolean().optional(),
  autoExecuteMediumRisk: z.boolean().optional(),
  morningBriefEnabled: z.boolean().optional(),
  morningBriefTime: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════
// Helper: Fetch workspace with settings
// ═══════════════════════════════════════════════════════════════

async function getWorkspaceWithSettings(workspaceId: string) {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (error || !workspace) {
    throw new NotFoundError('Workspace');
  }

  return workspace;
}

/** Extract nested settings object from workspace.settings JSONB */
function extractSettings(settings: Record<string, unknown> | null) {
  const s = settings ?? {};
  return {
    notifications: (s.notifications as Record<string, unknown>) ?? {},
    integrations: (s.integrations as Record<string, unknown>) ?? {},
    aiPreferences: (s.ai_preferences as Record<string, unknown>) ?? {},
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/settings — Get workspace settings
// ═══════════════════════════════════════════════════════════════

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const workspace = await getWorkspaceWithSettings(workspaceId);
    const { notifications, integrations, aiPreferences } = extractSettings(
      workspace.settings as Record<string, unknown> | null,
    );

    res.json({
      success: true,
      data: {
        workspace: {
          name: workspace.name,
          plan: workspace.plan,
          timezone: (workspace.settings as Record<string, unknown> | null)?.timezone ?? 'UTC',
          currency: (workspace.settings as Record<string, unknown> | null)?.currency ?? 'USD',
        },
        notifications,
        integrations,
        aiPreferences,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// PUT /api/v1/settings — Update settings
// ═══════════════════════════════════════════════════════════════

router.put(
  '/',
  requireAdmin,
  validateRequest(updateSettingsSchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const body = req.body as z.infer<typeof updateSettingsSchema>;

    // Fetch current workspace to merge settings
    const workspace = await getWorkspaceWithSettings(workspaceId);
    const currentSettings = (workspace.settings as Record<string, unknown>) ?? {};

    // Build updated settings object by merging deeply
    const updatedSettings: Record<string, unknown> = { ...currentSettings };

    if (body.workspace) {
      if (body.workspace.name) {
        // name is on the workspace table directly
        await supabase
          .from('workspaces')
          .update({ name: body.workspace.name })
          .eq('id', workspaceId);
      }
      if (body.workspace.timezone) {
        updatedSettings.timezone = body.workspace.timezone;
      }
      if (body.workspace.currency) {
        updatedSettings.currency = body.workspace.currency;
      }
    }

    if (body.notifications) {
      updatedSettings.notifications = {
        ...(currentSettings.notifications as Record<string, unknown> ?? {}),
        ...body.notifications,
      };
    }

    if (body.integrations) {
      updatedSettings.integrations = {
        ...(currentSettings.integrations as Record<string, unknown> ?? {}),
        ...body.integrations,
      };
    }

    if (body.aiPreferences) {
      updatedSettings.ai_preferences = {
        ...(currentSettings.ai_preferences as Record<string, unknown> ?? {}),
        ...body.aiPreferences,
      };
    }

    const { data, error } = await supabase
      .from('workspaces')
      .update({ settings: updatedSettings })
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new ValidationError(`Failed to update settings: ${error.message}`);
    }

    res.json({
      success: true,
      data: {
        workspace: {
          name: data.name,
          plan: data.plan,
          timezone: (data.settings as Record<string, unknown> | null)?.timezone ?? 'UTC',
          currency: (data.settings as Record<string, unknown> | null)?.currency ?? 'USD',
        },
        ...extractSettings(data.settings as Record<string, unknown> | null),
      },
      message: 'Settings updated successfully',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/settings/accounts — Connected ad accounts
// ═══════════════════════════════════════════════════════════════

router.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { data: accounts, error } = await supabase
      .from('ad_accounts')
      .select('id, platform, name, platform_account_id, status, token_expires_at, metadata, created_at, updated_at, last_synced_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ValidationError(`Failed to fetch accounts: ${error.message}`);
    }

    const mapped = (accounts ?? []).map((a) => ({
      id: a.id,
      platform: a.platform,
      accountName: a.name,
      platformAccountId: a.platform_account_id,
      status: a.status,
      lastSyncedAt: a.last_synced_at,
    }));

    res.json({
      success: true,
      data: mapped,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/settings/accounts/:id/reconnect — Reconnect account
// ═══════════════════════════════════════════════════════════════

router.post(
  '/accounts/:id/reconnect',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const accountId = req.params.id;

    // Verify account belongs to workspace
    const { data: account, error: findError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !account) {
      throw new NotFoundError('Ad account');
    }

    // In a real implementation, this would:
    // 1. Initiate the OAuth refresh flow for the specific platform
    // 2. Update tokens in the database upon success
    // For now, we mark the account as needing reconnection and return an auth URL

    const platform = account.platform as string;
    const metadata = (account.metadata as Record<string, unknown> | null) ?? {};

    // Update status to indicate reconnection in progress
    await supabase
      .from('ad_accounts')
      .update({
        status: 'expired',
        metadata: {
          ...metadata,
          reconnect_requested_at: new Date().toISOString(),
        },
      })
      .eq('id', accountId);

    // Build OAuth reconnect URL (platform-specific)
    const oauthUrls: Record<string, string> = {
      meta: `/api/v1/auth/meta/connect?workspace_id=${workspaceId}&account_id=${accountId}&reconnect=true`,
      google: `/api/v1/auth/google/connect?workspace_id=${workspaceId}&account_id=${accountId}&reconnect=true`,
      tiktok: `/api/v1/auth/tiktok/connect?workspace_id=${workspaceId}&account_id=${accountId}&reconnect=true`,
      snap: `/api/v1/auth/snap/connect?workspace_id=${workspaceId}&account_id=${accountId}&reconnect=true`,
    };

    logger(req).info(
      { accountId, platform },
      'Account reconnection initiated',
    );

    res.json({
      success: true,
      data: {
        accountId,
        platform,
        status: 'expired',
        reconnectUrl: oauthUrls[platform] ?? null,
        message: `Please complete OAuth reconnection for ${platform}`,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// DELETE /api/v1/settings/accounts/:id — Disconnect account
// ═══════════════════════════════════════════════════════════════

router.delete(
  '/accounts/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const accountId = req.params.id;

    // Verify account belongs to workspace before deleting
    const { data: account, error: findError } = await supabase
      .from('ad_accounts')
      .select('id, platform, name')
      .eq('id', accountId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !account) {
      throw new NotFoundError('Ad account');
    }

    const { error } = await supabase
      .from('ad_accounts')
      .delete()
      .eq('id', accountId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ValidationError(`Failed to disconnect account: ${error.message}`);
    }

    logger(req).info(
      { accountId, platform: account.platform, name: account.name },
      'Ad account disconnected',
    );

    res.status(200).json({
      success: true,
      message: `Account "${account.name}" disconnected successfully`,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/settings/team — Team members
// ═══════════════════════════════════════════════════════════════

router.get(
  '/team',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, user_id, role, status, created_at, updated_at, users!inner(id, name, email, avatar_url, last_active_at)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new ValidationError(`Failed to fetch team members: ${error.message}`);
    }

    const mapped = (members ?? []).map((m: Record<string, unknown>) => {
      const user = m.users as Record<string, unknown> | null;
      return {
        id: m.id,
        name: user?.name ?? 'Unknown',
        email: user?.email ?? '',
        role: m.role,
        status: m.status ?? 'active',
        lastActiveAt: user?.last_active_at ?? m.updated_at,
      };
    });

    res.json({
      success: true,
      data: mapped,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/settings/team — Invite team member
// ═══════════════════════════════════════════════════════════════

router.post(
  '/team',
  requireAdmin,
  validateRequest(inviteMemberSchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const body = req.body as z.infer<typeof inviteMemberSchema>;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', body.email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already a member of this workspace
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMember) {
        throw new ValidationError(
          `User ${body.email} is already a member of this workspace`,
        );
      }
    } else {
      // Create a placeholder user — they will complete signup via invite email
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: body.email,
          name: body.email.split('@')[0],
          status: 'pending_invite',
        })
        .select()
        .single();

      if (createError || !newUser) {
        throw new ValidationError(
          `Failed to create user: ${createError?.message ?? 'Unknown error'}`,
        );
      }

      userId = newUser.id;
    }

    // Add to workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: body.role,
        status: 'pending',
        invited_by: req.user?.sub,
      })
      .select()
      .single();

    if (memberError) {
      throw new ValidationError(
        `Failed to add member: ${memberError.message}`,
      );
    }

    logger(req).info(
      { userId, email: body.email, role: body.role },
      'Team member invited',
    );

    res.status(201).json({
      success: true,
      data: {
        id: member?.id,
        email: body.email,
        role: body.role,
        status: 'pending',
      },
      message: `Invitation sent to ${body.email}`,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// PUT /api/v1/settings/team/:id — Update member role
// ═══════════════════════════════════════════════════════════════

router.put(
  '/team/:id',
  requireAdmin,
  validateRequest(updateMemberRoleSchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const memberId = req.params.id;
    const body = req.body as z.infer<typeof updateMemberRoleSchema>;

    // Verify member belongs to workspace
    const { data: member, error: findError } = await supabase
      .from('workspace_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !member) {
      throw new NotFoundError('Team member');
    }

    // Prevent changing the workspace owner's role
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspace?.owner_id === member.user_id) {
      throw new ForbiddenError('Cannot modify the workspace owner\'s role');
    }

    const { data: updatedMember, error } = await supabase
      .from('workspace_members')
      .update({ role: body.role })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new ValidationError(`Failed to update member role: ${error.message}`);
    }

    logger(req).info(
      { memberId, oldRole: member.role, newRole: body.role },
      'Team member role updated',
    );

    res.json({
      success: true,
      data: updatedMember,
      message: 'Member role updated successfully',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// DELETE /api/v1/settings/team/:id — Remove member
// ═══════════════════════════════════════════════════════════════

router.delete(
  '/team/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const memberId = req.params.id;

    // Verify member belongs to workspace and get details
    const { data: member, error: findError } = await supabase
      .from('workspace_members')
      .select('id, user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !member) {
      throw new NotFoundError('Team member');
    }

    // Prevent removing the workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspace?.owner_id === member.user_id) {
      throw new ForbiddenError('Cannot remove the workspace owner');
    }

    // Prevent self-removal (admin cannot remove themselves)
    if (member.user_id === req.user?.sub) {
      throw new ForbiddenError('Cannot remove yourself from the workspace');
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ValidationError(`Failed to remove member: ${error.message}`);
    }

    logger(req).info({ memberId }, 'Team member removed');

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/settings/billing — Billing info
// ═══════════════════════════════════════════════════════════════

router.get(
  '/billing',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const workspace = await getWorkspaceWithSettings(workspaceId);

    // Get credit usage for current month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { data: creditUsage, error: creditError } = await supabase
      .from('credit_usage')
      .select('credits_used, feature')
      .eq('workspace_id', workspaceId)
      .gte('created_at', monthStart)
      .lte('created_at', `${monthEnd}T23:59:59.999Z`);

    if (creditError) {
      logger(req).warn(
        { error: creditError.message },
        'Failed to fetch credit usage',
      );
    }

    const creditsUsed = (creditUsage ?? []).reduce(
      (sum, entry) => sum + (entry.credits_used ?? 0),
      0,
    );

    // Get plan limits
    const planLimits: Record<string, number> = {
      free: 500,
      pro: 5000,
      premium: 20000,
      agency: 100000,
    };

    const creditsTotal = planLimits[workspace.plan as string] ?? 5000;

    // Build usage breakdown
    const usageBreakdown: Record<string, number> = {};
    for (const entry of creditUsage ?? []) {
      const feature = entry.feature ?? 'unknown';
      usageBreakdown[feature] = (usageBreakdown[feature] ?? 0) + (entry.credits_used ?? 0);
    }

    // Placeholder invoices (would query an invoices table in production)
    const invoices: Array<Record<string, unknown>> = [];

    res.json({
      success: true,
      data: {
        plan: workspace.plan,
        creditsUsed,
        creditsTotal,
        usageThisMonth: {
          total: creditsUsed,
          breakdown: usageBreakdown,
        },
        invoices,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/settings/notifications — Notification preferences
// ═══════════════════════════════════════════════════════════════

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const workspace = await getWorkspaceWithSettings(workspaceId);
    const { notifications } = extractSettings(
      workspace.settings as Record<string, unknown> | null,
    );

    const prefs = notifications as Record<string, unknown> | null;

    res.json({
      success: true,
      data: {
        channels: {
          email: (prefs?.channels as Record<string, unknown> | null)?.email ?? true,
          slack: (prefs?.channels as Record<string, unknown> | null)?.slack ?? false,
          inApp: (prefs?.channels as Record<string, unknown> | null)?.inApp ?? true,
        },
        types: {
          drafts: (prefs?.types as Record<string, unknown> | null)?.drafts ?? true,
          alerts: (prefs?.types as Record<string, unknown> | null)?.alerts ?? true,
          reports: (prefs?.types as Record<string, unknown> | null)?.reports ?? true,
          aiActions: (prefs?.types as Record<string, unknown> | null)?.aiActions ?? true,
        },
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// PUT /api/v1/settings/notifications — Update notification preferences
// ═══════════════════════════════════════════════════════════════

router.put(
  '/notifications',
  requireAdmin,
  validateRequest(updateNotificationsSchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const body = req.body as z.infer<typeof updateNotificationsSchema>;

    const workspace = await getWorkspaceWithSettings(workspaceId);
    const currentSettings = (workspace.settings as Record<string, unknown>) ?? {};
    const currentNotifications =
      (currentSettings.notifications as Record<string, unknown>) ?? {};

    const updatedNotifications: Record<string, unknown> = { ...currentNotifications };

    if (body.channels) {
      updatedNotifications.channels = {
        ...((currentNotifications.channels as Record<string, unknown>) ?? {}),
        ...body.channels,
      };
    }

    if (body.types) {
      updatedNotifications.types = {
        ...((currentNotifications.types as Record<string, unknown>) ?? {}),
        ...body.types,
      };
    }

    const updatedSettings = {
      ...currentSettings,
      notifications: updatedNotifications,
    };

    const { data, error } = await supabase
      .from('workspaces')
      .update({ settings: updatedSettings })
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new ValidationError(
        `Failed to update notification preferences: ${error.message}`,
      );
    }

    const prefs = (data.settings as Record<string, unknown> | null)?.notifications as
      | Record<string, unknown>
      | null;

    res.json({
      success: true,
      data: {
        channels: {
          email: (prefs?.channels as Record<string, unknown> | null)?.email ?? true,
          slack: (prefs?.channels as Record<string, unknown> | null)?.slack ?? false,
          inApp: (prefs?.channels as Record<string, unknown> | null)?.inApp ?? true,
        },
        types: {
          drafts: (prefs?.types as Record<string, unknown> | null)?.drafts ?? true,
          alerts: (prefs?.types as Record<string, unknown> | null)?.alerts ?? true,
          reports: (prefs?.types as Record<string, unknown> | null)?.reports ?? true,
          aiActions: (prefs?.types as Record<string, unknown> | null)?.aiActions ?? true,
        },
      },
      message: 'Notification preferences updated successfully',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/settings/ai — AI agent preferences
// ═══════════════════════════════════════════════════════════════

router.get(
  '/ai',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const workspace = await getWorkspaceWithSettings(workspaceId);
    const { aiPreferences } = extractSettings(
      workspace.settings as Record<string, unknown> | null,
    );

    const prefs = aiPreferences as Record<string, unknown> | null;

    res.json({
      success: true,
      data: {
        confidenceThreshold: (prefs?.confidenceThreshold as number) ?? 0.8,
        autoExecuteLowRisk: (prefs?.autoExecuteLowRisk as boolean) ?? false,
        autoExecuteMediumRisk: (prefs?.autoExecuteMediumRisk as boolean) ?? false,
        morningBriefEnabled: (prefs?.morningBriefEnabled as boolean) ?? true,
        morningBriefTime: (prefs?.morningBriefTime as string) ?? '08:00',
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// PUT /api/v1/settings/ai — Update AI preferences
// ═══════════════════════════════════════════════════════════════

router.put(
  '/ai',
  requireAdmin,
  validateRequest(updateAIPreferencesSchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const body = req.body as z.infer<typeof updateAIPreferencesSchema>;

    const workspace = await getWorkspaceWithSettings(workspaceId);
    const currentSettings = (workspace.settings as Record<string, unknown>) ?? {};
    const currentAIPrefs =
      (currentSettings.ai_preferences as Record<string, unknown>) ?? {};

    const updatedAIPrefs: Record<string, unknown> = { ...currentAIPrefs };

    if (body.confidenceThreshold !== undefined) {
      updatedAIPrefs.confidenceThreshold = body.confidenceThreshold;
    }
    if (body.autoExecuteLowRisk !== undefined) {
      updatedAIPrefs.autoExecuteLowRisk = body.autoExecuteLowRisk;
    }
    if (body.autoExecuteMediumRisk !== undefined) {
      updatedAIPrefs.autoExecuteMediumRisk = body.autoExecuteMediumRisk;
    }
    if (body.morningBriefEnabled !== undefined) {
      updatedAIPrefs.morningBriefEnabled = body.morningBriefEnabled;
    }
    if (body.morningBriefTime !== undefined) {
      updatedAIPrefs.morningBriefTime = body.morningBriefTime;
    }

    const updatedSettings = {
      ...currentSettings,
      ai_preferences: updatedAIPrefs,
    };

    const { data, error } = await supabase
      .from('workspaces')
      .update({ settings: updatedSettings })
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new ValidationError(
        `Failed to update AI preferences: ${error.message}`,
      );
    }

    const prefs = (data.settings as Record<string, unknown> | null)?.ai_preferences as
      | Record<string, unknown>
      | null;

    res.json({
      success: true,
      data: {
        confidenceThreshold: (prefs?.confidenceThreshold as number) ?? 0.8,
        autoExecuteLowRisk: (prefs?.autoExecuteLowRisk as boolean) ?? false,
        autoExecuteMediumRisk: (prefs?.autoExecuteMediumRisk as boolean) ?? false,
        morningBriefEnabled: (prefs?.morningBriefEnabled as boolean) ?? true,
        morningBriefTime: (prefs?.morningBriefTime as string) ?? '08:00',
      },
      message: 'AI preferences updated successfully',
    });
  }),
);

export default router;
