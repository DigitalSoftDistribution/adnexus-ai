import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import {
  Brain,
  CheckCircle,
  Globe,
  MessageSquare,
  Zap,
  BarChart3,
  Shield,
  TrendingUp,
} from 'lucide-react';

export const metadata = {
  title: 'Features',
  description: 'Discover all the features of AdNexus AI — from AI-powered campaign management to cross-platform analytics.',
};

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Agent',
    description: 'Autonomous monitoring that detects anomalies, suggests actions, and learns from every campaign.',
    href: '/features/ai-agent',
  },
  {
    icon: CheckCircle,
    title: 'Draft Approvals',
    description: 'AI-generated optimization drafts with one-click approval. Stay in control without the manual work.',
    href: '/features/approvals',
  },
  {
    icon: Globe,
    title: 'Cross-Platform',
    description: 'Unified dashboard for Meta, Google, TikTok, and Snap. One login, complete visibility.',
    href: '/features/platforms',
  },
  {
    icon: MessageSquare,
    title: 'Morning Brief',
    description: 'Daily digest of campaign performance, anomalies, and recommended actions.',
    href: '/features/morning-brief',
  },
  {
    icon: Zap,
    title: 'Creative Fatigue',
    description: 'Detect ad fatigue before it hurts performance. Get refresh recommendations.',
    href: '/features/creative-fatigue',
  },
  {
    icon: BarChart3,
    title: 'Budget Pacing',
    description: 'Smart budget allocation and pacing alerts to maximize ROAS.',
    href: '/features/budget-pacing',
  },
  {
    icon: Shield,
    title: 'Brand Safety',
    description: 'Automated checks ensure every ad meets your brand guidelines.',
    href: '/features/brand-safety',
  },
  {
    icon: TrendingUp,
    title: 'Attribution',
    description: 'Cross-platform attribution modeling to understand true campaign impact.',
    href: '/features/attribution',
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        badge="Features"
        title={<>Everything you need to <span className="text-gradient">scale</span></>}
        subtitle="A complete toolkit for modern advertising teams. AI-powered, cross-platform, and built for performance."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
        secondaryCta="See Pricing"
        secondaryCtaHref="/pricing"
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.title}>
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  href={feature.href}
                />
              </StaggerItem>
            ))}
          </FeatureGrid>
        </StaggerContainer>
      </Section>

      <CtaBand
        title="Ready to experience the future of advertising?"
        subtitle="Join thousands of marketers who trust AdNexus AI."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
        secondaryCta="Talk to Sales"
        secondaryCtaHref="/contact"
      />
    </>
  );
}
