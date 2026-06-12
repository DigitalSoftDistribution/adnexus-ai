import { AgentRulesContent } from '@/components/ai-agent/AgentRulesContent';

export function generateMetadata() {
  return {
    title: 'Automation Rules',
  };
}

export default function AgentRulesPage() {
  return <AgentRulesContent />;
}
