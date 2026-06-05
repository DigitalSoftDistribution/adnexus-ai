import type { ReactNode } from 'react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import './marketing.css';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-root min-h-[100dvh] flex flex-col">
      <MarketingHeader />
      <main className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
