import { PageHero, Section } from '@/components/marketing/sections';
import { FadeIn } from '@/components/marketing/v3/animations';
import { ContactForm } from '@/components/marketing/ContactForm';

export const metadata = {
  title: 'Contact',
  description: 'Get in touch with the AdNexus AI team. Sales, support, and partnership inquiries.',
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        badge="Contact"
        title={<>Let us <span className="text-gradient">talk</span></>}
        subtitle="Have a question about pricing, features, or enterprise plans? We are here to help."
      />

      <Section>
        <FadeIn className="max-w-xl mx-auto">
          <ContactForm />
        </FadeIn>
      </Section>
    </>
  );
}
