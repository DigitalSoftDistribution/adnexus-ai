import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Globe, BarChart3, Layers, Link2 } from 'lucide-react';

export const metadata = {
  title: 'Integrations',
  description:
    'Connect AdNexus AI to Meta Ads execution, read-only Google Ads coverage, coming-soon TikTok and Snap support, MCP clients, and your internal workflows.',
  alternates: { canonical: '/integrations' },
};

export default function IntegrationsPage() {
  return (
    <>
      <PageHero
        badge="Integrations"
        title={<>Connect your <span className="text-gradient">entire stack</span></>}
        subtitle="AdNexus AI connects launch-ready Meta execution with read-only and coming-soon platform coverage, MCP clients, and your internal workflows."
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Globe,
                title: 'Meta Ads',
                description: 'Facebook and Instagram campaign execution is launch-ready for the managed v1 pilot.',
              },
              {
                icon: BarChart3,
                title: 'Google Ads',
                description: 'Search, Display, YouTube, Shopping, and Performance Max are read-only in v1.',
              },
              {
                icon: Layers,
                title: 'TikTok Ads',
                description: 'TikTok Ads support is coming soon for managed write access.',
              },
              {
                icon: Link2,
                title: 'Snapchat Ads',
                description: 'Snap Ads support is coming soon for managed write access.',
              },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <FeatureCard icon={item.icon} title={item.title} description={item.description} />
              </StaggerItem>
            ))}
          </FeatureGrid>
        </StaggerContainer>
      </Section>

      <CtaBand
        title="Need a custom integration?"
        subtitle="Talk to us about MCP clients, Slack alerts, API access, and internal workflow connections."
        cta="Contact Sales"
        ctaHref="/contact"
        variant="dark"
      />
    </>
  );
}
