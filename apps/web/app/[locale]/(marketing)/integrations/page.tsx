import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Globe, BarChart3, Layers, Link2 } from 'lucide-react';

export const metadata = {
  title: 'Integrations',
  description: 'Connect AdNexus AI with your favorite tools — Meta, Google, TikTok, Snap, and more.',
};

export default function IntegrationsPage() {
  return (
    <>
      <PageHero
        badge="Integrations"
        title={<>Connect your <span className="text-gradient">entire stack</span></>}
        subtitle="AdNexus AI integrates with the platforms and tools you already use."
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Globe,
                title: 'Meta Ads',
                description: 'Full support for Facebook, Instagram, Messenger, and Audience Network.',
              },
              {
                icon: BarChart3,
                title: 'Google Ads',
                description: 'Search, Display, YouTube, Shopping, and Performance Max.',
              },
              {
                icon: Layers,
                title: 'TikTok Ads',
                description: 'In-Feed, TopView, Spark Ads, and Shopping Ads.',
              },
              {
                icon: Link2,
                title: 'Snapchat Ads',
                description: 'Snap Ads, Story Ads, Collection Ads, and Dynamic Ads.',
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
        subtitle="Our API and engineering team can build connections to your internal tools."
        cta="Contact Sales"
        ctaHref="/contact"
        variant="dark"
      />
    </>
  );
}
