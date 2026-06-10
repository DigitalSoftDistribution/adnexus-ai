import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { MCP_V2_SAFETY_MODEL, MCP_V2_TOOL_CATALOG } from '../../src/interface/http/routes/mcpCatalog';
import { UUIDS } from '../fixtures/data';

describe('V2 runtime mount — /api/v2/mcp', () => {
  it('returns 401 without a Bearer token on /status', async () => {
    const res = await request(app).get('/api/v2/mcp/status');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('returns 401 without a Bearer token on /tools', async () => {
    const res = await request(app).get('/api/v2/mcp/tools');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('returns truthful MCP status metadata for an authenticated owner', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/mcp/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      liveTransport: false,
      safetyModel: MCP_V2_SAFETY_MODEL,
    });
    expect(res.body.data.catalog.total).toBe(MCP_V2_TOOL_CATALOG.length);
    expect(res.body.data.gaps.length).toBeGreaterThan(0);
  });

  it('returns the full MCP tool catalog for an authenticated owner', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/mcp/tools')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tools).toHaveLength(MCP_V2_TOOL_CATALOG.length);
    expect(res.body.data.catalog.total).toBe(MCP_V2_TOOL_CATALOG.length);
  });

  it('filters catalog by mode=draft', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/mcp/tools?mode=draft')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tools.every((tool: { mode: string }) => tool.mode === 'draft')).toBe(true);
    expect(res.body.data.tools.length).toBeGreaterThan(0);
  });
});
