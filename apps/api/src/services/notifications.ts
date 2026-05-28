/**
 * Notifications service — re-exports from notification-service for compatibility.
 * Webhook handlers import from '../services/notifications'.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface CreateNotificationParams {
  workspaceId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      workspace_id: params.workspaceId,
      user_id: params.userId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority ?? 'info',
      metadata: params.metadata ?? {},
    });

    if (error) {
      logger.error({ error: error.message, params }, 'Failed to create notification');
    }
  } catch (err) {
    logger.error({ err, params }, 'Failed to create notification');
  }
}
