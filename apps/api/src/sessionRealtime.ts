import type { BetSession, SessionRealtimeEvent } from "@playbit/shared";

type Subscriber = (event: SessionRealtimeEvent) => void;

export class SessionRealtimeHub {
  private readonly subscribers = new Map<string, Set<Subscriber>>();

  publishSession(session: BetSession) {
    this.publish(session.id, {
      type: "session.updated",
      session
    });
  }

  subscribe(session: BetSession, subscriber: Subscriber) {
    const sessionSubscribers = this.subscribers.get(session.id) ?? new Set<Subscriber>();
    sessionSubscribers.add(subscriber);
    this.subscribers.set(session.id, sessionSubscribers);
    subscriber({
      type: "session.updated",
      session
    });

    return () => {
      const currentSubscribers = this.subscribers.get(session.id);
      currentSubscribers?.delete(subscriber);
      if (currentSubscribers && currentSubscribers.size === 0) {
        this.subscribers.delete(session.id);
      }
    };
  }

  private publish(sessionId: string, event: SessionRealtimeEvent) {
    for (const subscriber of this.subscribers.get(sessionId) ?? []) {
      subscriber(event);
    }
  }
}
