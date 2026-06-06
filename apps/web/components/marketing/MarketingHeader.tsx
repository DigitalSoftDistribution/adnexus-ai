'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { ChevronDown, Menu, X, Zap } from 'lucide-react';
import { HEADER_MENUS, type NavMenu } from '@/lib/marketing/nav';

function DesktopMenu({ menu }: { menu: NavMenu }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors"
        style={{ color: open ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        onClick={() => setOpen((v) => !v)}
      >
        {menu.label}
        <ChevronDown
          size={14}
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full pt-2 w-72 z-50"
          role="menu"
          aria-label={menu.label}
        >
          <div
            className="rounded-xl p-2 shadow-2xl"
            style={{
              background: 'var(--bg-popover)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {menu.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-hover)]"
              >
                <span className="block text-sm font-medium text-white">{item.label}</span>
                {item.description && (
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {item.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
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

  // Close mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header
      role="banner"
      className="fixed top-0 inset-x-0 z-40 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(5,5,5,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="AdNexus AI home">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <Zap size={16} style={{ color: '#0a0a0a' }} aria-hidden="true" />
          </span>
          <span className="font-space text-base font-bold text-white">AdNexus AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          <DesktopMenu menu={HEADER_MENUS[0]} />
          <DesktopMenu menu={HEADER_MENUS[1]} />
          <DesktopMenu menu={HEADER_MENUS[2]} />
          <Link
            href="/pricing"
            className="px-3 py-2 text-sm font-medium transition-colors hover:text-white"
            style={{ color: 'var(--text-secondary)' }}
          >
            Pricing
          </Link>
          <DesktopMenu menu={HEADER_MENUS[3]} />
          <DesktopMenu menu={HEADER_MENUS[4]} />
        </nav>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="px-3 py-2 text-sm font-medium transition-colors hover:text-white"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-transform hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: '#0a0a0a' }}
          >
            Request Pilot Access
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="lg:hidden p-2 rounded-lg text-white"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 top-0 z-50 overflow-y-auto"
          style={{ background: 'var(--bg-primary)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-between h-16 px-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <Link href="/" className="flex items-center gap-2" aria-label="AdNexus AI home">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Zap size={16} style={{ color: '#0a0a0a' }} aria-hidden="true" />
              </span>
              <span className="font-space text-base font-bold text-white">AdNexus AI</span>
            </Link>
            <button
              type="button"
              className="p-2 rounded-lg text-white"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-6">
            <Link href="/pricing" className="block text-lg font-semibold text-white">
              Pricing
            </Link>
            {HEADER_MENUS.map((menu) => (
              <div key={menu.label}>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {menu.label}
                </p>
                <div className="space-y-1">
                  {menu.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block py-1.5 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <Link
                href="/auth/signin"
                className="w-full text-center px-4 py-3 text-sm font-medium rounded-lg"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              >
                Sign in
              </Link>
              <Link
                href="/contact"
                className="w-full text-center px-4 py-3 text-sm font-bold rounded-lg"
                style={{ background: 'var(--accent)', color: '#0a0a0a' }}
              >
                Request Pilot Access
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
