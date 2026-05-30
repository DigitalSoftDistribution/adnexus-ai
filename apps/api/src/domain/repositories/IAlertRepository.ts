export interface Alert {
  id: string;
  workspaceId: string;
  name: string;
  type: 'budget' | 'performance' | 'anomaly' | 'opportunity';
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  enabled: boolean;
  channels: string[];
  lastTriggeredAt: Date | null;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertFilters {
  workspaceId: string;
  type?: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
}

export interface AlertListResult {
  alerts: Alert[];
  total: number;
  page: number;
  limit: number;
}

export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  triggeredAt: Date;
  metricValue: number;
  message: string;
  acknowledged: boolean;
}

export interface IAlertRepository {
  list(filters: AlertFilters): Promise<AlertListResult>;
  findById(id: string): Promise<Alert | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Alert | null>;
  create(alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Alert>;
  update(id: string, updates: Partial<Alert>): Promise<Alert | null>;
  delete(id: string): Promise<boolean>;
  toggle(id: string, enabled: boolean): Promise<Alert | null>;
  getHistory(alertId: string): Promise<AlertHistoryEntry[]>;
  addHistory(entry: Omit<AlertHistoryEntry, 'id'>): Promise<AlertHistoryEntry>;
}
