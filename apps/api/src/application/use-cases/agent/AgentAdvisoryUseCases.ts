/**
 * AI Agent advisory use-cases — recommendations, insights, conversations.
 * Thin RBAC-guarded wrappers around the IAgentAdvisor port.
 */

import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';
import type {
  IAgentAdvisor,
  AgentRecommendation,
  AgentInsight,
  AgentConversation,
  AgentMessage,
} from '../../ports/IAgentAdvisor';

const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];
const WRITE_ROLES = ['owner', 'admin', 'editor'];

function canRead(role: string) {
  return READ_ROLES.includes(role);
}
function canWrite(role: string) {
  return WRITE_ROLES.includes(role);
}

export class ListRecommendationsUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: { workspaceId: string; userRole: string }): Promise<Result<AgentRecommendation[]>> {
    if (!canRead(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    return ok(await this.advisor.listRecommendations(input.workspaceId));
  }
}

export class ApplyRecommendationUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: {
    workspaceId: string;
    userId: string;
    userRole: string;
    recommendationId: string;
  }): Promise<Result<{ draftId: string | null }>> {
    if (!canWrite(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    const result = await this.advisor.applyRecommendation(input.workspaceId, input.recommendationId, input.userId);
    if (!result.draftId) return err(new NotFoundError('Recommendation'));
    return ok(result);
  }
}

export class DismissRecommendationUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: {
    workspaceId: string;
    userId: string;
    userRole: string;
    recommendationId: string;
  }): Promise<Result<{ dismissed: true }>> {
    if (!canWrite(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    await this.advisor.dismissRecommendation(input.workspaceId, input.recommendationId, input.userId);
    return ok({ dismissed: true });
  }
}

export class ListInsightsUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: { workspaceId: string; userRole: string }): Promise<Result<AgentInsight[]>> {
    if (!canRead(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    return ok(await this.advisor.listInsights(input.workspaceId));
  }
}

export class ListConversationsUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: { workspaceId: string; userRole: string }): Promise<Result<AgentConversation[]>> {
    if (!canRead(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    return ok(await this.advisor.listConversations(input.workspaceId));
  }
}

export class CreateConversationUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: {
    workspaceId: string;
    userId: string;
    userRole: string;
    title?: string;
  }): Promise<Result<AgentConversation>> {
    if (!canRead(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    return ok(await this.advisor.createConversation(input.workspaceId, input.userId, input.title));
  }
}

export class GetConversationUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: {
    workspaceId: string;
    userRole: string;
    conversationId: string;
  }): Promise<Result<{ conversation: AgentConversation; messages: AgentMessage[] } | null>> {
    if (!canRead(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    return ok(await this.advisor.getConversation(input.workspaceId, input.conversationId));
  }
}

export class SendMessageUseCase {
  constructor(private advisor: IAgentAdvisor) {}
  async execute(input: {
    workspaceId: string;
    userRole: string;
    conversationId: string;
    content: string;
  }): Promise<Result<AgentMessage[]>> {
    if (!canRead(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    return ok(
      await this.advisor.sendMessage(input.workspaceId, input.conversationId, input.content),
    );
  }
}
