import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { ShoppingCart, TrendingUp, Zap, Target } from 'lucide-react';

export const metadata = {
  title: 'Ecommerce',
  description: 'AdNexus AI for ecommerce brands — optimize product campaigns, maximize ROAS, and scale profitably.',
};

export default function EcommercePage() {
  return (
    <>
      <PageHero
        badge="Ecommerce"
        title={<>Sell more, <span className="text-gradient">spend less</span></>}
        subtitle="AI-powered optimization for product campaigns across Meta, Google, and TikTok. Maximize ROAS and scale profitably."
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: 'ROAS Optimization',
                description: 'AI continuously adjusts bids and budgets to maximize return on ad spend across all platforms.',
              },
              {
                icon: Zap,
                title: 'Creative Fatigue Alerts',
                description: 'Detect when product ads start losing effectiveness and get refresh recommendations before sales drop.',
              },
              {
                icon: Target,
                title: 'Audience Insights',
                description: 'Understand which audiences drive the most revenue and where to allocate budget.',
              },
              {
                icon: ShoppingCart,
                title: 'Product Feed Sync',
                description: 'Sync your product catalog and automatically generate dynamic ads for new and trending items.',
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
        title="Ready to scale your store?"
        subtitle="Join thousands of ecommerce brands using AdNexus AI to drive profitable growth."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
