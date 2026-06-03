'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  createdAt: string;
}

interface NotificationList {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}

export function NotificationsMenu() {
  const t = useTranslations('notifications');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 'menu'],
    queryFn: async (): Promise<NotificationList> => {
      const res = await fetch('/api/v2/notifications?limit=8');
      if (!res.ok) throw new Error('Failed to load notifications');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await fetch('/api/v2/notifications/read-all', { method: 'PUT' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('title')}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">{t('title')}</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('markAllRead')}
            </button>
          )}
        </div>
        <div className="scrollbar-thin max-h-80 overflow-y-auto">
          {data?.notifications?.length ? (
            data.notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex gap-2 border-b px-3 py-2.5 last:border-0',
                  !n.read && 'bg-accent/30',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    n.read ? 'bg-transparent' : 'bg-primary',
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
