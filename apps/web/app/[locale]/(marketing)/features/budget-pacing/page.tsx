import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { BarChart3, TrendingUp, AlertTriangle, Target } from 'lucide-react';

export const metadata = {
  title: 'Budget Pacing',
  description: 'Smart budget allocation and pacing alerts to maximize ROAS.',
};

export default function BudgetPacingPage() {
  return (
    <>
      <PageHero
        badge="Budget Pacing"
        title={<>Spend smarter, <span className="text-gradient">not harder</span></>}
        subtitle="Intelligent budget monitoring that tracks pacing against your goals, alerts you to overspend or underspend, and recommends reallocation."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />

      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Budget intelligence
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Target,
                title: 'Goal-Based Pacing',
                description: 'Set daily, weekly, or monthly spend targets. AI tracks progress and forecasts outcomes.',
              },
              {
                icon: TrendingUp,
                title: 'Performance Forecasting',
                description: 'Predict where your budget will land based on current trends and historical data.',
              },
              {
                icon: AlertTriangle,
                title: 'Overspend Alerts',
                description: 'Get notified when campaigns are pacing too fast — before the budget is gone.',
              },
              {
                icon: BarChart3,
                title: 'Reallocation Suggestions',
                description: 'AI recommends shifting budget from underperformers to top performers.',
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
        title="Take control of your budget"
        subtitle="Stop guessing. Start pacing with precision."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
