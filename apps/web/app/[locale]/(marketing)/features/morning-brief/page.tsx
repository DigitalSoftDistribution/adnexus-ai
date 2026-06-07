import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { MessageSquare, Clock, TrendingUp, Bell } from 'lucide-react';

export const metadata = {
  title: 'Morning Brief',
  description: 'Daily digest of campaign performance, anomalies, and recommended actions delivered every morning.',
};

export default function MorningBriefPage() {
  return (
    <>
      <PageHero
        badge="Morning Brief"
        title={<>Your day starts <span className="text-gradient">informed</span></>}
        subtitle="A daily digest of everything that matters — performance summaries, anomaly alerts, and AI-recommended actions — delivered to your inbox every morning."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />

      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              What is in your brief
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: 'Performance Summary',
                description: 'Key metrics at a glance: spend, impressions, clicks, conversions, and ROAS across all platforms.',
              },
              {
                icon: Bell,
                title: 'Anomaly Alerts',
                description: 'Instant notifications when something unusual happens — good or bad.',
              },
              {
                icon: MessageSquare,
                title: 'AI Recommendations',
                description: 'Curated list of suggested actions with predicted impact scores.',
              },
              {
                icon: Clock,
                title: 'Scheduled Delivery',
                description: 'Choose your time zone and preferred delivery time. Always ready when you are.',
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
        title="Start every day with clarity"
        subtitle="No more digging through dashboards. Your morning brief has everything you need."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
