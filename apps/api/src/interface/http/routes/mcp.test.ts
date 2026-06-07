import { describe, expect, it } from 'vitest';
import {
  filterMcpCatalog,
  getMcpStatusMetadata,
  MCP_V2_REQUIRED_CATEGORIES,
  MCP_V2_SAFETY_MODEL,
  MCP_V2_TOOL_CATALOG,
  summarizeMcpCatalog,
} from './mcpCatalog';

describe('MCP V2 tool catalog', () => {
  it('is complete across required dashboard workflow categories', () => {
    const categories = new Set(MCP_V2_TOOL_CATALOG.map((tool) => tool.category));

    expect(categories).toEqual(new Set(MCP_V2_REQUIRED_CATEGORIES));
  });

  it('keeps writes draft-first or approval-only', () => {
    const unsafeWrites = MCP_V2_TOOL_CATALOG.filter(
      (tool) => tool.mode !== 'read' && tool.mode !== 'draft' && tool.mode !== 'approve',
    );

    expect(unsafeWrites).toEqual([]);
    expect(MCP_V2_TOOL_CATALOG.some((tool) => tool.mode === 'draft')).toBe(true);
    expect(MCP_V2_TOOL_CATALOG.some((tool) => tool.name === 'mcp_list_tools')).toBe(true);
  });

  it('declares scopes and implementation status for every tool', () => {
    expect(MCP_V2_TOOL_CATALOG.length).toBeGreaterThanOrEqual(30);

    for (const tool of MCP_V2_TOOL_CATALOG) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.requiredScopes.length).toBeGreaterThan(0);
      expect(['implemented', 'planned']).toContain(tool.status);
      expect(['read', 'draft', 'approve', 'admin']).toContain(tool.mode);
    }
  });

  it('summarizes catalog counts without importing route auth/config', () => {
    const summary = summarizeMcpCatalog();

    expect(summary.total).toBe(MCP_V2_TOOL_CATALOG.length);
    expect(summary.byStatus.implemented).toBeGreaterThan(0);
    expect(summary.byStatus.planned).toBeGreaterThan(0);
    expect(summary.byMode.read).toBeGreaterThan(0);
    expect(summary.byMode.draft).toBeGreaterThan(0);
    expect(summary.byCategory.campaigns).toBeGreaterThan(0);
  });

  it('filters catalog by safe metadata fields', () => {
    expect(filterMcpCatalog({ status: 'planned' }).every((tool) => tool.status === 'planned')).toBe(true);
    expect(filterMcpCatalog({ mode: 'draft' }).every((tool) => tool.mode === 'draft')).toBe(true);
    expect(filterMcpCatalog({ category: 'sync' }).every((tool) => tool.category === 'sync')).toBe(true);
  });

  it('reports truthful status metadata with no live transport claim', () => {
    const status = getMcpStatusMetadata();

    expect(status.liveTransport).toBe(false);
    expect(status.safetyModel).toEqual(MCP_V2_SAFETY_MODEL);
    expect(status.safetyModel.directPlatformWritesFromMcp).toBe(false);
    expect(status.catalog.total).toBe(MCP_V2_TOOL_CATALOG.length);
    expect(status.gaps.length).toBeGreaterThan(0);
  });
});
