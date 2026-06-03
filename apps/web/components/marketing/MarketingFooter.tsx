import { Link } from '@/i18n/navigation';
import { Zap, Github, Twitter, Linkedin } from 'lucide-react';
import { FOOTER_COLUMNS, LEGAL_LINKS } from '@/lib/marketing/nav';

const PLATFORMS = [
  { name: 'Meta', color: '#1877F2' },
  { name: 'Google', color: '#DB4437' },
  { name: 'TikTok', color: '#00F2EA' },
  { name: 'Snap', color: '#FFFC00' },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="w-full py-16 px-6"
      style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-8 mb-12">
          {/* Brand block */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3" aria-label="AdNexus AI home">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Zap size={16} style={{ color: '#0a0a0a' }} aria-hidden="true" />
              </span>
              <span className="font-space text-base font-bold text-white">AdNexus AI</span>
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[240px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              The intelligent campaign workspace. AI-powered ad management across Meta, Google, TikTok,
              and Snap — where every change is a draft awaiting your approval.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: <Twitter size={16} />, label: 'Twitter', href: 'https://twitter.com/adnexusai' },
                { icon: <Github size={16} />, label: 'GitHub', href: 'https://github.com/adnexusai' },
                { icon: <Linkedin size={16} />, label: 'LinkedIn', href: 'https://linkedin.com/company/adnexusai' },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:text-white"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] transition-colors hover:text-white"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              &copy; {year} AdNexus AI. All rights reserved.
            </p>
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] transition-colors hover:text-white"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {PLATFORMS.map((p) => (
              <span key={p.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {p.name}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
