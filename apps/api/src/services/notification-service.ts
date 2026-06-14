import { supabase } from '../lib/supabase';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors';

// ─── Types ───────────────────────────────────────────────────

export type NotificationType =
  | 'draft_approved'
  | 'draft_rejected'
  | 'draft_pending'
  | 'rule_triggered'
  | 'goal_at_risk'
  | 'goal_off_track'
  | 'budget_alert'
  | 'team_invite'
  | 'welcome'
  | 'morning_brief'
  | 'system';

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateNotificationInput {
  workspaceId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  status?: 'read' | 'unread' | 'all';
  type?: NotificationType;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationPreferences {
  workspace_id: string;
  user_id: string;
  email: {
    draft_approved: boolean;
    draft_rejected: boolean;
    rule_triggered: boolean;
    goal_alert: boolean;
    budget_alert: boolean;
    daily_digest: boolean;
    weekly_summary: boolean;
  };
  in_app: {
    draft_approved: boolean;
    draft_rejected: boolean;
    rule_triggered: boolean;
    goal_alert: boolean;
    budget_alert: boolean;
    daily_digest: boolean;
    weekly_summary: boolean;
  };
  slack_channel: string | null;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const DEDUP_WINDOW_MINUTES = 60;

/** Check if a duplicate notification exists within the dedup window */
async function isDuplicate(input: CreateNotificationInput): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString();

  let query = supabase
    .from('notifications')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('type', input.type)
    .eq('title', input.title)
    .gte('created_at', since)
    .limit(1);

  if (input.userId) {
    query = query.eq('user_id', input.userId);
  } else {
    query = query.is('user_id', null);
  }

  const { data } = await query;
  return (data ?? []).length > 0;
}

// ─── Create Notification ─────────────────────────────────────

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  // Auto-dedup: skip duplicate notifications of same type for same target within 1 hour
  const duplicate = await isDuplicate(input);
  if (duplicate) {
    throw new ValidationError(
      `Duplicate notification: a ${input.type} notification with the same title already exists within the last ${DEDUP_WINDOW_MINUTES} minutes`,
      { type: input.type, title: input.title },
    );
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: 'medium',
      read: false,
      metadata: input.data ?? {},
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create notification: ${error?.message ?? 'unknown error'}`);
  }

  return data as Notification;
}

// ─── List Notifications ──────────────────────────────────────

export async function listNotifications(
  workspaceId: string,
  userId: string,
  options?: ListOptions,
): Promise<PaginatedResult<Notification>> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const statusFilter = options?.status ?? 'all';

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false });

  if (statusFilter === 'read') {
    query = query.eq('read', true);
  } else if (statusFilter === 'unread') {
    query = query.eq('read', false);
  }

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list notifications: ${error.message}`);
  }

  return {
    items: (data ?? []) as Notification[],
    total: count ?? 0,
    limit,
    offset,
  };
}

// ─── Get Unread Count ────────────────────────────────────────

export async function getUnreadCount(workspaceId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('read', false)
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count ?? 0;
}

// ─── Mark as Read ────────────────────────────────────────────

export async function markAsRead(notificationId: string, userId: string): Promise<Notification> {
  // Verify the notification exists and belongs to the user (or is a broadcast)
  const { data: existing } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (!existing) {
    throw new NotFoundError('Notification');
  }

  if (existing.user_id !== null && existing.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to mark this notification as read');
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to mark notification as read: ${error?.message ?? 'unknown error'}`);
  }

  return data as Notification;
}

// ─── Mark All as Read ────────────────────────────────────────

export async function markAllAsRead(
  workspaceId: string,
  userId: string,
): Promise<{ updated: number }> {
  // Mark all unread notifications for this workspace + user as read
  // This includes both direct notifications and broadcasts
  const { error, count } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('read', false)
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (error) {
    throw new Error(`Failed to mark all as read: ${error.message}`);
  }

  return { updated: count ?? 0 };
}

// ─── Delete Notification ─────────────────────────────────────

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  // Verify the notification exists and belongs to the user (or is a broadcast)
  const { data: existing } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (!existing) {
    throw new NotFoundError('Notification');
  }

  if (existing.user_id !== null && existing.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this notification');
  }

  const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
}

// ─── Notification Preferences ────────────────────────────────

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'workspace_id' | 'user_id' | 'updated_at'> = {
  email: {
    draft_approved: true,
    draft_rejected: true,
    rule_triggered: true,
    goal_alert: true,
    budget_alert: true,
    daily_digest: true,
    weekly_summary: false,
  },
  in_app: {
    draft_approved: true,
    draft_rejected: true,
    rule_triggered: true,
    goal_alert: true,
    budget_alert: true,
    daily_digest: true,
    weekly_summary: false,
  },
  slack_channel: null,
};

export async function getNotificationPreferences(
  workspaceId: string,
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Return default preferences if none exist yet (no row found is not an error)
    if (error?.code === 'PGRST116') {
      return {
        workspace_id: workspaceId,
        user_id: userId,
        ...DEFAULT_PREFERENCES,
        updated_at: new Date().toISOString(),
      };
    }
    throw new Error(`Failed to get notification preferences: ${error?.message ?? 'unknown error'}`);
  }

  return data as NotificationPreferences;
}

export async function updateNotificationPreferences(
  workspaceId: string,
  userId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  // Get existing or use defaults
  const existing = await getNotificationPreferences(workspaceId, userId);

  // Merge
  const merged: NotificationPreferences = {
    ...existing,
    ...prefs,
    email: prefs.email ? { ...existing.email, ...prefs.email } : existing.email,
    in_app: prefs.in_app ? { ...existing.in_app, ...prefs.in_app } : existing.in_app,
    workspace_id: workspaceId,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // Upsert
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(merged, { onConflict: 'workspace_id,user_id' })
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update notification preferences: ${error?.message ?? 'unknown error'}`,
    );
  }

  return data as NotificationPreferences;
}

// ─── Broadcast to Workspace ──────────────────────────────────

export async function broadcastToWorkspace(
  workspaceId: string,
  notification: CreateNotificationInput,
): Promise<void> {
  // Get all workspace members
  const { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId);

  if (membersError) {
    throw new Error(`Failed to get workspace members: ${membersError.message}`);
  }

  if (!members || members.length === 0) {
    return; // No members to notify
  }

  // Create a broadcast notification (user_id = null) instead of per-user rows.
  const { error } = await supabase.from('notifications').insert({
    workspace_id: workspaceId,
    user_id: null,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: 'medium',
    read: false,
    metadata: notification.data ?? {},
  });

  if (error) {
    throw new Error(`Failed to broadcast notification: ${error.message}`);
  }
}
