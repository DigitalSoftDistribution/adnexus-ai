import {
  LayoutDashboard,
  Megaphone,
  FileEdit,
  Users,
  BarChart3,
  Bot,
  Bell,
  Target,
  Plug,
  ServerCog,
  Webhook,
  CreditCard,
  Settings,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  /** i18n key under the `navigation` namespace. */
  labelKey: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** i18n key under the `navigation.groups` namespace. */
  titleKey: string;
  items: NavItem[];
}

/**
 * Clustered information architecture for the dashboard. Shared by the Sidebar
 * and the command palette so navigation stays in sync.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'overview',
    items: [{ href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard }],
  },
  {
    titleKey: 'campaigns',
    items: [
      { href: '/dashboard/campaigns', labelKey: 'campaigns', icon: Megaphone },
      { href: '/dashboard/drafts', labelKey: 'drafts', icon: FileEdit },
      { href: '/dashboard/audiences', labelKey: 'audiences', icon: Users },
      { href: '/dashboard/reports', labelKey: 'reports', icon: BarChart3 },
    ],
  },
  {
    titleKey: 'automation',
    items: [
      { href: '/dashboard/ai-agent', labelKey: 'aiAgent', icon: Bot },
      { href: '/dashboard/alerts', labelKey: 'alerts', icon: Bell },
      { href: '/dashboard/goals', labelKey: 'goals', icon: Target },
    ],
  },
  {
    titleKey: 'connect',
    items: [
      { href: '/dashboard/integrations', labelKey: 'integrations', icon: Plug },
      { href: '/dashboard/mcp', labelKey: 'mcp', icon: ServerCog },
      { href: '/dashboard/webhooks', labelKey: 'webhooks', icon: Webhook },
    ],
  },
  {
    titleKey: 'workspace',
    items: [
      { href: '/dashboard/billing', labelKey: 'billing', icon: CreditCard },
      { href: '/dashboard/settings', labelKey: 'settings', icon: Settings },
      { href: '/dashboard/audit-log', labelKey: 'auditLog', icon: ScrollText },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
