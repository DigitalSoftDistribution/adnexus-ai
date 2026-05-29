export interface NotificationChannel {
  type: 'email' | 'slack' | 'in_app' | 'webhook';
  config: Record<string, unknown>;
}

export interface NotificationPayload {
  workspaceId: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

export interface INotificationService {
  send(payload: NotificationPayload): Promise<void>;
  sendBulk(payloads: NotificationPayload[]): Promise<void>;
  schedule(payload: NotificationPayload, sendAt: Date): Promise<void>;
}
