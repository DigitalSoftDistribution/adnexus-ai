import { Link } from 'react-router-dom'

const footerLinks = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Campaigns', path: '/campaigns' },
  { label: 'Ads', path: '/ads' },
  { label: 'AI Agent', path: '/ai-agent' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' },
  { label: 'Privacy', path: '#' },
  { label: 'Terms', path: '#' },
]

function PlatformIcon({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2" title={label}>
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
    </div>
  )
}

export default function Footer() {
  return (
    <footer
      className="w-full py-10 px-6"
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-space font-bold text-lg text-white tracking-tight">
              AdNexus
            </span>
            <span
              className="inline-block w-1.5 h-1.5 rounded-sm rotate-45"
              style={{ background: 'var(--accent)' }}
            />
          </Link>

          {/* Nav links */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className="text-xs transition-colors hover:text-white"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Platform icons */}
          <div className="flex items-center gap-4">
            <PlatformIcon color="#1877F2" label="Meta" />
            <PlatformIcon color="#DB4437" label="Google" />
            <PlatformIcon color="#00F2EA" label="TikTok" />
            <PlatformIcon color="#FFFC00" label="Snap" />
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            &copy; 2025 AdNexus AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Made with AI
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
