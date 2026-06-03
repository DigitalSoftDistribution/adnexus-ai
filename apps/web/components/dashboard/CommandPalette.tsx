'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
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

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
}

/**
 * Global ⌘K command palette. Opens with Cmd/Ctrl+K and offers quick navigation
 * across the clustered IA, a create action, and live global search results.
 */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
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

  const { data: results } = useQuery({
    queryKey: ['search', query],
    enabled: open && query.trim().length >= 2,
    queryFn: async (): Promise<SearchResult[]> => {
      const res = await fetch(`/api/v2/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const isSearching = query.trim().length >= 2;

  function go(href: string) {
    setOpen(false);
    setQuery('');
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

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput placeholder={tc('search')} value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{tc('noResults')}</CommandEmpty>
          {isSearching && results && results.length > 0 && (
            <CommandGroup heading={tc('search')}>
              {results.map((r) => (
                <CommandItem key={`${r.type}-${r.id}`} value={`${r.type}-${r.id}`} onSelect={() => go(r.url)}>
                  <Search className="mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">{r.title}</span>
                  <span className="ml-2 text-xs capitalize text-muted-foreground">{r.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!isSearching && (
            <>
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
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
