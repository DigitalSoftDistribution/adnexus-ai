export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationFilters {
  workspaceId: string;
  userId: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationListResult {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface INotificationRepository {
  list(filters: NotificationFilters): Promise<NotificationListResult>;
  findById(id: string): Promise<Notification | null>;
  markAsRead(id: string): Promise<boolean>;
  markAllAsRead(workspaceId: string, userId: string): Promise<number>;
  delete(id: string): Promise<boolean>;
}
