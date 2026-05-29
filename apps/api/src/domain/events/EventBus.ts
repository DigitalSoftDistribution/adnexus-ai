import type { DomainEvent } from './DomainEvent';

export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;
  unsubscribe(eventName: string, handler: EventHandler<DomainEvent>): void;
}

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler<DomainEvent>>>();

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventName = event.getEventName();
    const handlers = this.handlers.get(eventName);
    if (!handlers) return;

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Event handler failed for ${eventName}:`, err);
      }
    });

    await Promise.all(promises);
  }

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler as EventHandler<DomainEvent>);
  }

  unsubscribe(eventName: string, handler: EventHandler<DomainEvent>): void {
    this.handlers.get(eventName)?.delete(handler);
  }
}
