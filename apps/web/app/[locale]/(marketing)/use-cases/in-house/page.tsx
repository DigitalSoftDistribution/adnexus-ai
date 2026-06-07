import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Users, Brain, Clock, BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'In-House Teams',
  description: 'AdNexus AI for in-house marketing teams — autonomous monitoring, intelligent optimization, and cross-platform insights.',
};

export default function InHousePage() {
  return (
    <>
      <PageHero
        badge="In-House Teams"
        title={<>Supercharge your <span className="text-gradient">marketing team</span></>}
        subtitle="Give your in-house team AI-powered insights and automation. Focus on strategy while AI handles the repetitive work."
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Brain,
                title: 'AI Co-Pilot',
                description: 'Every team member gets an AI analyst that monitors campaigns and surfaces insights automatically.',
              },
              {
                icon: Clock,
                title: 'Time Savings',
                description: 'Save 10+ hours per week on reporting, analysis, and manual optimization tasks.',
              },
              {
                icon: BarChart3,
                title: 'Unified Analytics',
                description: 'One dashboard for all platforms. No more switching between Meta, Google, TikTok, and Snap.',
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Share insights, assign tasks, and track approvals in one place.',
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
        title="Ready to empower your team?"
        subtitle="Join in-house teams at leading brands using AdNexus AI to drive better results."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
