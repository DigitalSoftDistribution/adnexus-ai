import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { CheckCircle, Shield, Clock, Users } from 'lucide-react';

export const metadata = {
  title: 'Draft Approvals',
  description: 'AI-generated optimization drafts with one-click approval. Stay in control without the manual work.',
};

export default function ApprovalsPage() {
  return (
    <>
      <PageHero
        badge="Draft Approvals"
        title={<>Stay in control, <span className="text-gradient">without the work</span></>}
        subtitle="AI generates optimization drafts based on real data. You review and approve with one click. Full audit trail included."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />

      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              How approvals work
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'AI Generates Drafts',
                description: 'The AI creates optimization proposals with predicted impact and confidence scores.',
              },
              {
                icon: Users,
                title: 'Team Review',
                description: 'Share drafts with stakeholders. Comment, discuss, and refine before execution.',
              },
              {
                icon: CheckCircle,
                title: 'One-Click Approve',
                description: 'Approve individual changes or entire batches. Changes deploy instantly.',
              },
              {
                icon: Clock,
                title: 'Full Audit Trail',
                description: 'Every change is logged with who approved it, when, and the predicted vs actual impact.',
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
        title="Never miss an optimization opportunity"
        subtitle="AI handles the analysis. You make the decisions."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
