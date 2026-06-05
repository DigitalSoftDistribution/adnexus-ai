import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations';

export const metadata = {
  title: 'About',
  description: 'Learn about AdNexus AI — our mission, team, and vision for the future of advertising.',
};

const VALUES = [
  {
    title: 'AI-First',
    description: 'We believe AI should augment human creativity, not replace it. Our platform handles the repetitive so you can focus on strategy.',
  },
  {
    title: 'Transparency',
    description: 'Every AI recommendation includes reasoning and predicted impact. You are always in control.',
  },
  {
    title: 'Privacy',
    description: 'Your data is yours. We never sell it, share it, or use it to train models for other customers.',
  },
  {
    title: 'Performance',
    description: 'We measure success by your ROAS. If you are not winning, we are not winning.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        badge="About"
        title={<>Built for marketers, <span className="text-gradient">powered by AI</span></>}
        subtitle="AdNexus AI was founded with a simple belief: advertising teams deserve intelligent tools that work as hard as they do."
      />

      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Our values
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {VALUES.map((v) => (
            <StaggerItem key={v.title}>
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-muted-foreground">{v.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      <CtaBand
        title="Join the team"
        subtitle="We are always looking for talented people who care about building the future of advertising."
        cta="View Open Positions"
        ctaHref="/careers"
        variant="dark"
      />
    </>
  );
}
