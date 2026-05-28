import { describe, it, expect, vi } from 'vitest';
import { InMemoryEventBus } from './EventBus';
import { CampaignCreatedEvent, DraftApprovedEvent } from './DomainEvent';

describe('InMemoryEventBus', () => {
  it('publishes events to subscribers', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.subscribe('campaign.created', handler);
    const event = new CampaignCreatedEvent('camp-1', 'ws-1', 'meta', 'Test Campaign');
    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      campaignId: 'camp-1',
      workspaceId: 'ws-1',
    }));
  });

  it('does not call unsubscribed handlers', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.subscribe('campaign.created', handler);
    bus.unsubscribe('campaign.created', handler);

    const event = new CampaignCreatedEvent('camp-1', 'ws-1', 'meta', 'Test');
    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('handles multiple subscribers', async () => {
    const bus = new InMemoryEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.subscribe('campaign.created', handler1);
    bus.subscribe('campaign.created', handler2);

    const event = new CampaignCreatedEvent('camp-1', 'ws-1', 'meta', 'Test');
    await bus.publish(event);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('isolates event types', async () => {
    const bus = new InMemoryEventBus();
    const campaignHandler = vi.fn();
    const draftHandler = vi.fn();

    bus.subscribe('campaign.created', campaignHandler);
    bus.subscribe('draft.approved', draftHandler);

    await bus.publish(new CampaignCreatedEvent('camp-1', 'ws-1', 'meta', 'Test'));

    expect(campaignHandler).toHaveBeenCalledTimes(1);
    expect(draftHandler).not.toHaveBeenCalled();
  });

  it('continues despite handler errors', async () => {
    const bus = new InMemoryEventBus();
    const errorHandler = vi.fn().mockImplementation(() => {
      throw new Error('Handler failed');
    });
    const successHandler = vi.fn();

    bus.subscribe('campaign.created', errorHandler);
    bus.subscribe('campaign.created', successHandler);

    const event = new CampaignCreatedEvent('camp-1', 'ws-1', 'meta', 'Test');
    await bus.publish(event);

    expect(errorHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalled();
  });

  it('assigns unique event IDs', () => {
    const event1 = new CampaignCreatedEvent('camp-1', 'ws-1', 'meta', 'Test');
    const event2 = new CampaignCreatedEvent('camp-2', 'ws-1', 'meta', 'Test 2');

    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('sets occurredAt timestamp', () => {
    const before = new Date();
    const event = new DraftApprovedEvent('draft-1', 'ws-1', 'user-1');
    const after = new Date();

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
