import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// ─── Notification Type ───────────────────────────────────────

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
  | 'system'
  | 'test';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  channels: {
    email: boolean;
    in_app: boolean;
    push: boolean;
    slack: boolean;
  };
  types: Record<NotificationType, boolean>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

// ─── GET /notifications — List notifications ─────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    // Parse pagination
    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? '20', 10)));
    const offset = (page - 1) * limit;

    // Parse filters
    const type = req.query.type as string | undefined;
    const priority = req.query.priority as string | undefined;
    const readParam = req.query.read as string | undefined;

    // Build query
    let dbQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      dbQuery = dbQuery.eq('type', type);
    }
    if (priority) {
      dbQuery = dbQuery.eq('priority', priority);
    }
    if (readParam !== undefined) {
      const isRead = readParam === 'true';
      dbQuery = dbQuery.eq('read', isRead);
    }

    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;
    if (error) {
      throw new Error(`Failed to list notifications: ${error.message}`);
    }

    // Get unread count
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (unreadError) {
      throw new Error(`Failed to get unread count: ${unreadError.message}`);
    }

    res.json({
      data: (data ?? []) as Notification[],
      total: count ?? 0,
      unreadCount: unreadCount ?? 0,
    });
  }),
);

// ─── GET /notifications/unread-count ─────────────────────────

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }

    res.json({ count: count ?? 0 });
  }),
);

// ─── PUT /notifications/:id/read — Mark as read ──────────────

router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const notificationId = req.params.id;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError('Notification');
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to mark notification as read: ${error?.message ?? 'unknown error'}`);
    }

    res.json({ success: true, data: data as Notification });
  }),
);

// ─── PUT /notifications/read-all — Mark all as read ──────────

router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const { error, count } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }

    res.json({ success: true, updated: count ?? 0 });
  }),
);

// ─── DELETE /notifications/:id — Delete notification ─────────

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const notificationId = req.params.id;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError('Notification');
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }

    res.status(204).send();
  }),
);

// ─── GET /notifications/preferences — Get preferences ─────────

router.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get notification preferences: ${error.message}`);
    }

    // Return defaults if no preferences row exists
    const preferences: NotificationPreferences = data
      ? (data.preferences as unknown as NotificationPreferences)
      : getDefaultPreferences();

    res.json(preferences);
  }),
);

// ─── PUT /notifications/preferences — Update preferences ──────

router.put(
  '/preferences',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const schema = z.object({
      channels: z.object({
        email: z.boolean(),
        in_app: z.boolean(),
        push: z.boolean(),
        slack: z.boolean(),
      }).optional(),
      types: z.record(z.boolean()).optional(),
      quietHours: z.object({
        enabled: z.boolean(),
        start: z.string(),
        end: z.string(),
        timezone: z.string(),
      }).optional(),
    });

    const body = schema.parse(req.body);

    // Merge with existing preferences
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const current = existing
      ? (existing.preferences as unknown as NotificationPreferences)
      : getDefaultPreferences();

    const merged: NotificationPreferences = {
      channels: body.channels ? { ...current.channels, ...body.channels } : current.channels,
      types: body.types ? { ...current.types, ...body.types } : current.types,
      quietHours: body.quietHours ? { ...current.quietHours, ...body.quietHours } : current.quietHours,
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          preferences: merged as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to update notification preferences: ${error?.message ?? 'unknown error'}`,
      );
    }

    res.json(data.preferences as unknown as NotificationPreferences);
  }),
);

// ─── POST /notifications/test — Send test notification ────────

router.post(
  '/test',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification. If you see this, your notification system is working correctly.',
        data: { source: 'test_endpoint', triggered_by: userId },
        priority: 'normal',
        read: false,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create test notification: ${error?.message ?? 'unknown error'}`);
    }

    res.status(201).json({
      success: true,
      data: data as Notification,
      message: 'Test notification created',
    });
  }),
);

// ─── Helpers ──────────────────────────────────────────────────

function getDefaultPreferences(): NotificationPreferences {
  return {
    channels: {
      email: true,
      in_app: true,
      push: false,
      slack: false,
    },
    types: {
      draft_approved: true,
      draft_rejected: true,
      draft_pending: true,
      rule_triggered: true,
      goal_at_risk: true,
      goal_off_track: true,
      budget_alert: true,
      team_invite: true,
      welcome: true,
      system: true,
      test: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
    },
  };
}

export default router;
