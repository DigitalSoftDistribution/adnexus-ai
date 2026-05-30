export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  abstract getEventName(): string;
}

export class CampaignCreatedEvent extends DomainEvent {
  constructor(
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly platform: string,
    readonly name: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'campaign.created';
  }
}

export class CampaignUpdatedEvent extends DomainEvent {
  constructor(
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly changes: Record<string, unknown>,
  ) {
    super();
  }

  getEventName(): string {
    return 'campaign.updated';
  }
}

export class DraftCreatedEvent extends DomainEvent {
  constructor(
    readonly draftId: string,
    readonly workspaceId: string,
    readonly draftType: string,
    readonly actorType: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'draft.created';
  }
}

export class DraftApprovedEvent extends DomainEvent {
  constructor(
    readonly draftId: string,
    readonly workspaceId: string,
    readonly approvedBy: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'draft.approved';
  }
}

export class DraftExecutedEvent extends DomainEvent {
  constructor(
    readonly draftId: string,
    readonly workspaceId: string,
    readonly success: boolean,
    readonly durationMs?: number,
  ) {
    super();
  }

  getEventName(): string {
    return 'draft.executed';
  }
}

export class UserInvitedEvent extends DomainEvent {
  constructor(
    readonly workspaceId: string,
    readonly invitedUserId: string,
    readonly invitedBy: string,
    readonly role: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'user.invited';
  }
}

export class AdAccountConnectedEvent extends DomainEvent {
  constructor(
    readonly adAccountId: string,
    readonly workspaceId: string,
    readonly platform: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'ad-account.connected';
  }
}

export class AdAccountDisconnectedEvent extends DomainEvent {
  constructor(
    readonly adAccountId: string,
    readonly workspaceId: string,
    readonly platform: string,
    readonly reason?: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'ad-account.disconnected';
  }
}

export class AutomationRuleTriggeredEvent extends DomainEvent {
  constructor(
    readonly ruleId: string,
    readonly workspaceId: string,
    readonly triggerType: string,
    readonly actionType: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'automation-rule.triggered';
  }
}

export class GoalAchievedEvent extends DomainEvent {
  constructor(
    readonly goalId: string,
    readonly workspaceId: string,
    readonly metricType: string,
    readonly targetValue: number,
    readonly actualValue: number,
  ) {
    super();
  }

  getEventName(): string {
    return 'goal.achieved';
  }
}

export class GoalMissedEvent extends DomainEvent {
  constructor(
    readonly goalId: string,
    readonly workspaceId: string,
    readonly metricType: string,
    readonly targetValue: number,
    readonly actualValue: number,
  ) {
    super();
  }

  getEventName(): string {
    return 'goal.missed';
  }
}

export class ReportGeneratedEvent extends DomainEvent {
  constructor(
    readonly reportId: string,
    readonly workspaceId: string,
    readonly reportType: string,
    readonly format: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'report.generated';
  }
}

export class WebhookDeliveredEvent extends DomainEvent {
  constructor(
    readonly webhookConfigId: string,
    readonly workspaceId: string,
    readonly event: string,
    readonly success: boolean,
  ) {
    super();
  }

  getEventName(): string {
    return 'webhook.delivered';
  }
}
