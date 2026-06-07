import { McpContent } from '@/components/mcp/McpContent';

export function generateMetadata() {
  return {
    title: 'MCP Server',
  };
}

export default function McpPage() {
  return <McpContent />;
}
