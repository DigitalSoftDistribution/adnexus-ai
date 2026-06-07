import { PageHero, Section, FeatureCard, FeatureGrid } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export const metadata = {
  title: 'Compare',
  description: 'See how AdNexus AI compares to other advertising platforms and tools.',
};

const COMPARISONS = [
  { name: 'vs Madgicx', href: '/compare/madgicx' },
  { name: 'vs Smartly.io', href: '/compare/smartly' },
  { name: 'vs Revealbot', href: '/compare/revealbot' },
  { name: 'vs AdEspresso', href: '/compare/adespresso' },
  { name: 'vs Pipeboard', href: '/compare/pipeboard' },
  { name: 'vs AdKit', href: '/compare/adkit' },
];

export default function ComparePage() {
  return (
    <>
      <PageHero
        badge="Compare"
        title={<>How we <span className="text-gradient">stack up</span></>}
        subtitle="See how AdNexus AI compares to other advertising platforms and tools on the market."
      />

      <Section>
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {COMPARISONS.map((c) => (
            <StaggerItem key={c.href}>
              <Link
                href={c.href}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-all"
              >
                <span className="font-display font-semibold text-foreground">{c.name}</span>
                <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>
    </>
  );
}
