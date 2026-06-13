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

  it('returns 401 without a Bearer token on tool invoke', async () => {
    const res = await request(app).post('/api/v2/mcp/tools/mcp_get_status/invoke').send({});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('invokes mcp_get_status and returns live metadata', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .post('/api/v2/mcp/tools/mcp_get_status/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ arguments: {} });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tool).toBe('mcp_get_status');
    expect(res.body.data.result).toMatchObject({
      liveTransport: false,
      safetyModel: MCP_V2_SAFETY_MODEL,
    });
  });

  it('returns 404 for unknown MCP tools', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .post('/api/v2/mcp/tools/not_a_real_tool/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ arguments: {} });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('returns 501 for planned MCP tools', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const planned = MCP_V2_TOOL_CATALOG.find((tool) => tool.status === 'planned');
    expect(planned).toBeDefined();

    const res = await request(app)
      .post(`/api/v2/mcp/tools/${planned!.name}/invoke`)
      .set('Authorization', `Bearer ${token}`)
      .send({ arguments: {} });

    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_IMPLEMENTED' } });
  });

  it('enforces draft-first for write-mode tools', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .post('/api/v2/mcp/tools/campaign_update_draft/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ arguments: { campaignId: UUIDS.campaign1 } });

    expect(res.status).toBe(200);
    expect(res.body.data.result).toMatchObject({
      draftFirst: true,
      backendRoute: expect.stringContaining('/api/v2/'),
    });
  });
});
