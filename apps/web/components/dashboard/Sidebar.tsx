'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Bot,
  FileEdit,
  BarChart3,
  Settings,
  Users,
  Bell,
  CreditCard,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  user: { name: string | null; email: string; role: string } | null;
  onSignOut?: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/dashboard/ai-agent', label: 'AI Agent', icon: Bot },
  { href: '/dashboard/drafts', label: 'Drafts', icon: FileEdit },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/audiences', label: 'Audiences', icon: Users },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">A</span>
          </div>
          AdNexus AI
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 space-y-1">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name ?? user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}
