import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata = {
  title: 'Legal',
  description: 'Legal information for AdNexus AI.',
};

export default function LegalIndexPage() {
  return (
    <LegalPage title="Legal">
      <p className="text-muted-foreground">
        Please select a document from the footer links below.
      </p>
    </LegalPage>
  );
}
