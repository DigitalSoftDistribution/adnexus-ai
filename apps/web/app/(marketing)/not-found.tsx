import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-mono-data text-6xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
          404
        </p>
        <h1 className="font-space text-2xl font-semibold text-white mb-3">Page not found</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-lg"
          style={{ background: 'var(--accent)', color: '#0a0a0a' }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </section>
  );
}
