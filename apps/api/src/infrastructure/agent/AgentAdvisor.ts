/**
 * AgentAdvisor — infrastructure adapter implementing IAgentAdvisor.
 *
 * Bridges the ai-engine RecommendationGenerator + DraftCreator and the
 * Postgres-backed insight/recommendation-state/conversation tables (migrations
 * 025). Conversation replies are a deterministic assistant stub today — the
 * wiring (persistence + contract) is real so a model backend can drop in later.
 */

import { query } from '../database/connection';
import { RecommendationGenerator, DraftCreator } from '../../ai-engine';
import type {
  IAgentAdvisor,
  AgentRecommendation,
  AgentInsight,
  AgentConversation,
  AgentMessage,
} from '../../application/ports/IAgentAdvisor';

interface RecStateRow {
  recommendation_id: string;
  status: 'pending' | 'applied' | 'dismissed';
  applied_draft_id: string | null;
}

export class AgentAdvisor implements IAgentAdvisor {
  private _generator?: RecommendationGenerator;
  private _draftCreator?: DraftCreator;

  /** Lazily construct engine deps so the DI container can be built without
   * the ai-engine being fully initialized (and to play nice with test mocks). */
  private get generator(): RecommendationGenerator {
    return (this._generator ??= new RecommendationGenerator());
  }
  private get draftCreator(): DraftCreator {
    return (this._draftCreator ??= new DraftCreator());
  }

  async listRecommendations(workspaceId: string): Promise<AgentRecommendation[]> {
    const recs = await this.generator.generateRecommendations(workspaceId);

    const { rows: states } = await query<RecStateRow>(
      `SELECT recommendation_id, status, applied_draft_id FROM ai_recommendation_states WHERE workspace_id = $1`,
      [workspaceId],
    );
    const stateMap = new Map(states.map((s) => [s.recommendation_id, s]));

    return recs
      .filter((rec) => stateMap.get(rec.id)?.status !== 'dismissed')
      .map((rec) => {
        const state = stateMap.get(rec.id);
        return {
          id: rec.id,
          type: rec.type,
          title: rec.title,
          description: rec.description,
          campaignId: rec.campaignIds[0] ?? null,
          targetEntity: rec.targetEntity,
          explanation: rec.explanation,
          evidenceMetrics: rec.evidenceMetrics,
          platform: rec.platform,
          estimatedImpact: rec.estimatedImpact
            ? `${rec.estimatedImpact.direction === 'increase' ? '+' : '-'}${rec.estimatedImpact.magnitude}${rec.estimatedImpact.unit} ${rec.estimatedImpact.metric}`
            : 'Unknown',
          confidence: rec.confidence,
          riskLevel: rec.riskLevel,
          priority: rec.priority,
          status: (state?.status ?? 'pending') as AgentRecommendation['status'],
          proposedChanges: rec.proposedChanges,
          rollbackCondition: rec.rollbackCondition,
          model: rec.model,
          modelVersion: rec.modelVersion,
          source: rec.source,
          reasoning: rec.reasoning,
          createdAt: rec.createdAt,
          expiresAt: rec.expiresAt ?? null,
          appliedDraftId: state?.applied_draft_id ?? null,
        };
      });
  }

  async applyRecommendation(
    workspaceId: string,
    recommendationId: string,
    userId: string,
  ): Promise<{ draftId: string | null }> {
    const recs = await this.generator.generateRecommendations(workspaceId);
    const rec = recs.find((r) => r.id === recommendationId);
    if (!rec) return { draftId: null };

    const draft = (await this.draftCreator.createDraftFromRecommendation(rec, workspaceId)) as {
      id?: string;
    };
    const draftId = draft?.id ?? null;

    await query(
      `INSERT INTO ai_recommendation_states (workspace_id, recommendation_id, status, applied_draft_id, updated_by, updated_at)
       VALUES ($1, $2, 'applied', $3, $4, NOW())
       ON CONFLICT (workspace_id, recommendation_id)
       DO UPDATE SET status = 'applied', applied_draft_id = EXCLUDED.applied_draft_id, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [workspaceId, recommendationId, draftId, userId],
    );

    return { draftId };
  }

  async dismissRecommendation(
    workspaceId: string,
    recommendationId: string,
    userId: string,
  ): Promise<void> {
    await query(
      `INSERT INTO ai_recommendation_states (workspace_id, recommendation_id, status, updated_by, updated_at)
       VALUES ($1, $2, 'dismissed', $3, NOW())
       ON CONFLICT (workspace_id, recommendation_id)
       DO UPDATE SET status = 'dismissed', updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [workspaceId, recommendationId, userId],
    );
  }

  async listInsights(workspaceId: string): Promise<AgentInsight[]> {
    interface InsightRow {
      type: string | null;
      title: string | null;
      description: string | null;
      impact: string | null;
      confidence: number | null;
      related_campaigns: string[] | null;
      created_at: string;
    }
    const { rows } = await query<InsightRow>(
      `SELECT type, title, description, impact, confidence, related_campaigns, created_at
       FROM ai_insights WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [workspaceId],
    );
    return rows.map((r) => ({
      type: r.type ?? 'general',
      title: r.title ?? 'Untitled Insight',
      description: r.description ?? '',
      impact: r.impact ?? 'medium',
      confidence: Number(r.confidence ?? 0.7),
      relatedCampaigns: Array.isArray(r.related_campaigns) ? r.related_campaigns : [],
      createdAt: r.created_at,
    }));
  }

  async listConversations(workspaceId: string): Promise<AgentConversation[]> {
    const { rows } = await query<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, title, created_at, updated_at FROM agent_conversations
       WHERE workspace_id = $1 ORDER BY updated_at DESC LIMIT 50`,
      [workspaceId],
    );
    return rows.map(this.mapConversation);
  }

  async createConversation(
    workspaceId: string,
    userId: string,
    title?: string,
  ): Promise<AgentConversation> {
    const { rows } = await query<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO agent_conversations (workspace_id, user_id, title)
       VALUES ($1, $2, $3)
       RETURNING id, title, created_at, updated_at`,
      [workspaceId, userId, title ?? 'New conversation'],
    );
    return this.mapConversation(rows[0]);
  }

  async getConversation(
    workspaceId: string,
    conversationId: string,
  ): Promise<{ conversation: AgentConversation; messages: AgentMessage[] } | null> {
    const { rows: convRows } = await query<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, title, created_at, updated_at FROM agent_conversations
       WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [conversationId, workspaceId],
    );
    if (!convRows[0]) return null;

    const { rows: msgRows } = await query<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      created_at: string;
    }>(
      `SELECT id, role, content, created_at FROM agent_messages
       WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId],
    );

    return {
      conversation: this.mapConversation(convRows[0]),
      messages: msgRows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
    };
  }

  async sendMessage(
    workspaceId: string,
    conversationId: string,
    content: string,
  ): Promise<AgentMessage[]> {
    const { rows: convRows } = await query<{ id: string }>(
      `SELECT id FROM agent_conversations WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [conversationId, workspaceId],
    );
    if (!convRows[0]) return [];

    const { rows: userRows } = await query<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      created_at: string;
    }>(
      `INSERT INTO agent_messages (conversation_id, role, content)
       VALUES ($1, 'user', $2)
       RETURNING id, role, content, created_at`,
      [conversationId, content],
    );

    const replyText = await this.buildReply(workspaceId, content);
    const { rows: assistantRows } = await query<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      created_at: string;
    }>(
      `INSERT INTO agent_messages (conversation_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING id, role, content, created_at`,
      [conversationId, replyText],
    );

    await query(`UPDATE agent_conversations SET updated_at = NOW() WHERE id = $1`, [conversationId]);

    return [...userRows, ...assistantRows].map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));
  }

  private async buildReply(workspaceId: string, _userMessage: string): Promise<string> {
    // Deterministic assistant summary grounded in current recommendations.
    const recs = await this.generator.generateRecommendations(workspaceId).catch(() => []);
    if (recs.length === 0) {
      return 'I reviewed your account and found no high-priority actions right now. Everything looks healthy.';
    }
    const top = recs.slice(0, 3).map((r) => `• ${r.title}`).join('\n');
    return `I found ${recs.length} optimization opportunit${recs.length === 1 ? 'y' : 'ies'}. Top suggestions:\n${top}\n\nOpen the Recommendations tab to apply any of these as a draft.`;
  }

  private mapConversation(row: {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
  }): AgentConversation {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
