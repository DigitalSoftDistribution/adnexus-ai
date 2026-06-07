import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Building2, Users, BarChart3, Shield } from 'lucide-react';

export const metadata = {
  title: 'Agencies',
  description: 'AdNexus AI for advertising agencies — multi-client management, white-label reports, and team collaboration.',
};

export default function AgenciesPage() {
  return (
    <>
      <PageHero
        badge="Agencies"
        title={<>Scale your agency <span className="text-gradient">with AI</span></>}
        subtitle="Manage dozens of client accounts from one intelligent dashboard. Automate reporting, catch issues early, and deliver better results."
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Users,
                title: 'Multi-Client Management',
                description: 'Organize all client accounts in one place with role-based access and custom permissions.',
              },
              {
                icon: BarChart3,
                title: 'White-Label Reports',
                description: 'Generate branded performance reports with your logo and colors. Export to PDF or share via link.',
              },
              {
                icon: Shield,
                title: 'Client Isolation',
                description: 'Each client data is fully isolated. Team members only see what they are authorized to see.',
              },
              {
                icon: Building2,
                title: 'Agency Pricing',
                description: 'Flexible plans that scale with your client roster. Volume discounts available.',
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
        title="Ready to scale your agency?"
        subtitle="Join hundreds of agencies using AdNexus AI to deliver better results for their clients."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
