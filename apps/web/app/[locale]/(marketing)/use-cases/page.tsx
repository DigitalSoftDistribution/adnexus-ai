import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Building2, ShoppingCart, Users } from 'lucide-react';

export const metadata = {
  title: 'Use Cases',
  description: 'See how agencies, ecommerce brands, and in-house teams use AdNexus AI.',
};

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        badge="Use Cases"
        title={<>Built for every <span className="text-gradient">team</span></>}
        subtitle="Whether you are an agency managing dozens of accounts or an in-house team focused on growth, AdNexus AI adapts to your workflow."
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Building2,
                title: 'Agencies',
                description: 'Manage multiple client accounts from one dashboard. White-label reports and team collaboration built in.',
                href: '/use-cases/agencies',
              },
              {
                icon: ShoppingCart,
                title: 'Ecommerce',
                description: 'Optimize product campaigns across Meta, Google, and TikTok with AI-powered ROAS targeting.',
                href: '/use-cases/ecommerce',
              },
              {
                icon: Users,
                title: 'In-House Teams',
                description: 'Give your marketing team superpowers with autonomous monitoring and intelligent optimization.',
                href: '/use-cases/in-house',
              },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <FeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  href={item.href}
                />
              </StaggerItem>
            ))}
          </FeatureGrid>
        </StaggerContainer>
      </Section>

      <CtaBand
        title="Find your use case"
        subtitle="Talk to our team about how AdNexus AI fits your specific needs."
        cta="Contact Sales"
        ctaHref="/contact"
        variant="dark"
      />
    </>
  );
}
