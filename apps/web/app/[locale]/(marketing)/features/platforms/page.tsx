import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Globe, Layers, BarChart3, Link2 } from 'lucide-react';

export const metadata = {
  title: 'Cross-Platform',
  description: 'Unified dashboard for Meta, Google, TikTok, and Snap. One login, complete visibility.',
};

export default function PlatformsPage() {
  return (
    <>
      <PageHero
        badge="Cross-Platform"
        title={<>One dashboard, <span className="text-gradient">every platform</span></>}
        subtitle="Connect Meta, Google Ads, TikTok, and Snapchat in minutes. View unified analytics, compare performance, and manage campaigns from a single interface."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />

      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Supported platforms
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Globe,
                title: 'Meta Ads',
                description: 'Full support for Facebook, Instagram, Messenger, and Audience Network campaigns.',
              },
              {
                icon: BarChart3,
                title: 'Google Ads',
                description: 'Search, Display, YouTube, Shopping, and Performance Max campaigns.',
              },
              {
                icon: Layers,
                title: 'TikTok Ads',
                description: 'In-Feed, TopView, Spark Ads, and Shopping Ads with full funnel tracking.',
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
        title="Unify your advertising stack"
        subtitle="Stop switching between platforms. Start seeing the big picture."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
