'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { HEADER_MENUS, type NavMenu } from '@/lib/marketing/nav';
import { cn } from '@/lib/utils';

function DesktopDropdown({ menu }: { menu: NavMenu }) {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground data-[state=open]:text-foreground h-9">
        {menu.label}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
          {menu.items.map((item) => (
            <ListItem key={item.href} href={item.href} title={item.label}>
              {item.description}
            </ListItem>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function ListItem({
  className,
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<'li'> & { href: string; title: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground',
            className
          )}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          {children && (
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          )}
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      role="banner"
      className={cn(
        'fixed top-0 inset-x-0 z-40 transition-all duration-300 border-b',
        scrolled
          ? 'bg-background/60 backdrop-blur-xl border-border/40'
          : 'bg-transparent border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" aria-label="AdNexus AI home">
          <span className="relative w-6 h-6 rounded-md flex items-center justify-center bg-primary">
            <span className="absolute inset-0 rounded-md bg-primary animate-pulse opacity-20" />
            <span className="relative w-2 h-2 rounded-full bg-primary-foreground" />
          </span>
          <span className="font-display text-sm font-semibold text-foreground tracking-tight">
            AdNexus
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center">
          <NavigationMenu>
            <NavigationMenuList>
              <DesktopDropdown menu={HEADER_MENUS[0]} />
              <DesktopDropdown menu={HEADER_MENUS[1]} />
              <DesktopDropdown menu={HEADER_MENUS[2]} />
              <NavigationMenuItem>
                <Link href="/pricing" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Pricing
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <DesktopDropdown menu={HEADER_MENUS[3]} />
              <DesktopDropdown menu={HEADER_MENUS[4]} />
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
          <Button size="sm" className="h-8" asChild>
            <Link href="/auth/signup">Start Free Trial</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open menu">
              <Menu size={18} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] bg-background border-border">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md flex items-center justify-center bg-primary">
                  <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                </span>
                <span className="font-display text-sm font-semibold">AdNexus</span>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <Link
                href="/pricing"
                className="block text-lg font-semibold text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </Link>
              {HEADER_MENUS.map((menu) => (
                <div key={menu.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
                    {menu.label}
                  </p>
                  <div className="space-y-1">
                    {menu.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-4 flex flex-col gap-3 border-t border-border">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auth/signin">Sign in</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/auth/signup">Start Free Trial</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
