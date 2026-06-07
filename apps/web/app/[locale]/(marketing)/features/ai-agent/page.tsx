import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem, LivingMockup } from '@/components/marketing/v3/animations';
import { Brain, Eye, Sparkles, Activity } from 'lucide-react';

export const metadata = {
  title: 'AI Agent',
  description: 'Autonomous AI agent that monitors your campaigns 24/7, detects anomalies, and suggests optimizations.',
};

export default function AiAgentPage() {
  return (
    <>
      <PageHero
        badge="AI Agent"
        title={<>Your 24/7 <span className="text-gradient">campaign analyst</span></>}
        subtitle="An autonomous AI agent that never sleeps. It monitors every metric, detects anomalies in real time, and delivers actionable insights directly to your inbox."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      >
        <FadeIn className="mt-12">
          <LivingMockup className="max-w-4xl mx-auto" />
        </FadeIn>
      </PageHero>

      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              What the AI Agent does
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Eye,
                title: 'Continuous Monitoring',
                description: 'Watches CTR, CPC, ROAS, and custom KPIs across all connected platforms every minute.',
              },
              {
                icon: Activity,
                title: 'Anomaly Detection',
                description: 'Identifies unusual patterns — sudden spend spikes, performance drops, or audience shifts.',
              },
              {
                icon: Sparkles,
                title: 'Smart Suggestions',
                description: 'Generates optimization drafts with predicted impact scores before you approve.',
              },
              {
                icon: Brain,
                title: 'Learning Engine',
                description: 'Adapts to your brand voice, budget rules, and performance goals over time.',
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
        title="Let AI handle the heavy lifting"
        subtitle="Focus on strategy while your AI agent monitors and optimizes around the clock."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
