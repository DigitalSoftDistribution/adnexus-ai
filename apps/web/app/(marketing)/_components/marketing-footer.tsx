import Link from 'next/link';

const FOOTER_GROUPS: ReadonlyArray<{ title: string; links: { href: string; label: string }[] }> = [
  {
    title: 'Product',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/tools/roas-calculator', label: 'ROAS Calculator' },
      { href: '/auth/signup', label: 'Start Free Trial' },
    ],
  },
  {
    title: 'Compare',
    links: [
      { href: '/compare/pipeboard', label: 'vs Pipeboard' },
      { href: '/compare/madgicx', label: 'vs Madgicx' },
      { href: '/compare/birch', label: 'vs Birch' },
      { href: '/compare/smartly', label: 'vs Smartly' },
      { href: '/compare/adkit', label: 'vs AdKit' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/auth/signin', label: 'Sign in' },
    ],
  },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#050505]" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold text-white" aria-label="AdNexus AI home">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#c3f53b] text-sm font-bold text-black">
                A
              </span>
              <span className="text-lg">AdNexus AI</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-400">
              AI-powered ad management across Meta, Google, TikTok, and Snap — where every change is a
              draft awaiting your approval.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-white">{group.title}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">© {year} AdNexus AI. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Meta Business Partner</span>
            <span aria-hidden="true">•</span>
            <span>Google Partner</span>
            <span aria-hidden="true">•</span>
            <span>SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
