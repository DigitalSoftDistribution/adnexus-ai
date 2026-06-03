'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ChevronsUpDown, LogOut, Menu, Settings, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CommandPalette } from './CommandPalette';
import { NotificationsMenu } from './NotificationsMenu';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  user: { name: string | null; email: string; role: string } | null;
  onSignOut?: () => void;
  onOpenMobileNav?: () => void;
}

export function Topbar({ user, onSignOut, onOpenMobileNav }: TopbarProps) {
  const t = useTranslations('navigation');
  const initials = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase();

  return (
    <header className="flex h-16 items-center gap-3 border-b bg-card/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/40">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Workspace switcher (single-workspace today, dropdown-ready) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="hidden h-9 gap-2 sm:flex">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">
              {initials}
            </span>
            <span className="max-w-[140px] truncate text-sm font-medium">
              {user?.name ?? t('workspace')}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{t('groups.workspace')}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 h-4 w-4" />
              {t('settings')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-1 justify-center px-2">
        <CommandPalette />
      </div>

      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationsMenu />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {initials}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate">{user?.name ?? user?.email}</span>
              <span className="truncate text-xs font-normal capitalize text-muted-foreground">
                {user?.role}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <UserIcon className="mr-2 h-4 w-4" />
                {t('settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSignOut?.()}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
