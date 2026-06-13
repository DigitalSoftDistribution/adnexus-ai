import { DomainError, NotFoundError } from '../../../domain/value-objects/Result';
import {
  MCP_V2_TOOL_CATALOG,
  filterMcpCatalog,
  getMcpStatusMetadata,
  summarizeMcpCatalog,
  type McpToolCatalogEntry,
  type McpToolMode,
} from './mcpCatalog';

export interface McpInvokeInput {
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface McpInvokeOutcome {
  tool: string;
  mode: McpToolMode;
  result: unknown;
}

function findTool(name: string): McpToolCatalogEntry | undefined {
  return MCP_V2_TOOL_CATALOG.find((tool) => tool.name === name);
}

/**
 * Minimal HTTP invoke bridge for the MCP catalog. Metadata tools return live
 * data; read tools echo backendRoute hints; write modes enforce draft-first.
 */
export function invokeMcpTool(input: McpInvokeInput): McpInvokeOutcome {
  const tool = findTool(input.toolName);
  if (!tool) {
    throw new NotFoundError('MCP tool');
  }

  if (tool.status === 'planned') {
    throw new DomainError(`${tool.name} is not implemented yet`, 'NOT_IMPLEMENTED', 501);
  }

  if (tool.name === 'mcp_get_status') {
    return { tool: tool.name, mode: tool.mode, result: getMcpStatusMetadata() };
  }

  if (tool.name === 'mcp_list_tools') {
    const mode = typeof input.arguments?.mode === 'string' ? input.arguments.mode : undefined;
    const status = typeof input.arguments?.status === 'string' ? input.arguments.status : undefined;
    const category = typeof input.arguments?.category === 'string' ? input.arguments.category : undefined;
    const tools = filterMcpCatalog({ mode, status, category });

    return {
      tool: tool.name,
      mode: tool.mode,
      result: {
        tools,
        catalog: summarizeMcpCatalog(),
      },
    };
  }

  if (tool.mode === 'draft' || tool.mode === 'approve') {
    return {
      tool: tool.name,
      mode: tool.mode,
      result: {
        draftFirst: true,
        message: 'Write tools must create a draft for human approval before execution.',
        backendRoute: tool.backendRoute,
        arguments: input.arguments ?? {},
      },
    };
  }

  return {
    tool: tool.name,
    mode: tool.mode,
    result: {
      readOnly: true,
      backendRoute: tool.backendRoute,
      arguments: input.arguments ?? {},
    },
  };
}
