import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Zap, Eye, BarChart3, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Creative Fatigue',
  description: 'Detect ad fatigue before it hurts performance. Get refresh recommendations.',
};

export default function CreativeFatiguePage() {
  return (
    <>
      <PageHero
        badge="Creative Fatigue"
        title={<>Catch fatigue <span className="text-gradient">before it spreads</span></>}
        subtitle="AI monitors creative performance over time and alerts you when ads start losing effectiveness. Get actionable refresh recommendations."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />

      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              How it works
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Eye,
                title: 'Performance Tracking',
                description: 'Monitors CTR, engagement rate, and conversion trends for every creative over time.',
              },
              {
                icon: BarChart3,
                title: 'Fatigue Scoring',
                description: 'Each creative gets a fatigue score based on performance decay patterns.',
              },
              {
                icon: Zap,
                title: 'Early Warnings',
                description: 'Get alerted before performance drops significantly — not after.',
              },
              {
                icon: RefreshCw,
                title: 'Refresh Suggestions',
                description: 'AI suggests new headlines, visuals, and CTAs based on top-performing variants.',
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
        title="Keep your creatives fresh"
        subtitle="Never let ad fatigue drain your budget again."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
