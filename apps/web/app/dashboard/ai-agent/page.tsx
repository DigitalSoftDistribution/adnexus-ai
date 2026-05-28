import { Metadata } from 'next';
import { AIAgentContent } from '@/components/ai-agent/AIAgentContent';

export const metadata: Metadata = {
  title: 'AI Agent',
};

export default function AIAgentPage() {
  return <AIAgentContent />;
}
