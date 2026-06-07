/**
 * IAgentAdvisor — application port for the AI agent advisory surface.
 *
 * Abstracts the recommendation engine, stored insights, recommendation
 * apply/dismiss state, and lightweight chat conversations behind a single
 * interface so use-cases stay independent of the ai-engine + persistence.
 */

export interface AgentRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  campaignId: string | null;
  platform: string;
  estimatedImpact: string;
  confidence: string;
  priority: number;
  status: 'pending' | 'applied' | 'dismissed';
  reasoning: string;
  createdAt: string;
  expiresAt: string | null;
  appliedDraftId: string | null;
}

export interface AgentInsight {
  type: string;
  title: string;
  description: string;
  impact: string;
  confidence: number;
  relatedCampaigns: string[];
  createdAt: string;
}

export interface AgentConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface IAgentAdvisor {
  listRecommendations(workspaceId: string): Promise<AgentRecommendation[]>;
  applyRecommendation(
    workspaceId: string,
    recommendationId: string,
    userId: string,
  ): Promise<{ draftId: string | null }>;
  dismissRecommendation(
    workspaceId: string,
    recommendationId: string,
    userId: string,
  ): Promise<void>;
  listInsights(workspaceId: string): Promise<AgentInsight[]>;
  listConversations(workspaceId: string): Promise<AgentConversation[]>;
  createConversation(workspaceId: string, userId: string, title?: string): Promise<AgentConversation>;
  getConversation(
    workspaceId: string,
    conversationId: string,
  ): Promise<{ conversation: AgentConversation; messages: AgentMessage[] } | null>;
  sendMessage(
    workspaceId: string,
    conversationId: string,
    content: string,
  ): Promise<AgentMessage[]>;
}
