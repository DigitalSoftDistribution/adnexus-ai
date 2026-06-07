import { PageHero, Section, FeatureCard, FeatureGrid } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';
import { Shield, Lock, Server, Eye } from 'lucide-react';

export const metadata = {
  title: 'Security',
  description: 'Enterprise-grade security at AdNexus AI. SOC 2, GDPR, encryption, and more.',
};

export default function SecurityPage() {
  return (
    <>
      <PageHero
        badge="Security"
        title={<>Your data, <span className="text-gradient">protected</span></>}
        subtitle="Enterprise-grade security and compliance built into every layer of AdNexus AI."
      />

      <Section>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'SOC 2 Type II',
                description: 'Independently audited controls for security, availability, and confidentiality.',
              },
              {
                icon: Lock,
                title: 'End-to-End Encryption',
                description: 'AES-256 at rest and TLS 1.3 in transit. Your data is encrypted everywhere.',
              },
              {
                icon: Server,
                title: 'GDPR Compliant',
                description: 'Full compliance with EU data protection regulations. Data residency options available.',
              },
              {
                icon: Eye,
                title: 'Audit Logs',
                description: 'Complete audit trail of every action. Export logs for compliance reviews.',
              },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <FeatureCard icon={item.icon} title={item.title} description={item.description} />
              </StaggerItem>
            ))}
          </FeatureGrid>
        </StaggerContainer>
      </Section>
    </>
  );
}
