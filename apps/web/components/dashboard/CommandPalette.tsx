'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Plus, Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { NAV_GROUPS } from './nav-config';

/**
 * Global ⌘K command palette. Opens with Cmd/Ctrl+K and offers quick navigation
 * across the clustered IA plus a couple of create actions.
 */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const t = useTranslations('navigation');
  const tc = useTranslations('common');

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{tc('search')}</span>
        <kbd className="hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={tc('search')} />
        <CommandList>
          <CommandEmpty>{tc('noResults')}</CommandEmpty>
          <CommandGroup heading={t('groups.create')}>
            <CommandItem onSelect={() => go('/dashboard/campaigns/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('newCampaign')}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {NAV_GROUPS.map((group) => (
            <CommandGroup key={group.titleKey} heading={t(`groups.${group.titleKey}`)}>
              {group.items.map((item) => (
                <CommandItem key={item.href} onSelect={() => go(item.href)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {t(item.labelKey)}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
