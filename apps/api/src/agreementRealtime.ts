import type { Agreement, AgreementRealtimeEvent } from "@playbit/shared";

type Subscriber = (event: AgreementRealtimeEvent) => void;

export class AgreementRealtimeHub {
  private readonly subscribers = new Map<string, Set<Subscriber>>();

  publishAgreement(agreement: Agreement) {
    this.publish(agreement.id, {
      type: "agreement.updated",
      agreement
    });
  }

  subscribe(agreement: Agreement, subscriber: Subscriber) {
    const agreementSubscribers = this.subscribers.get(agreement.id) ?? new Set<Subscriber>();
    agreementSubscribers.add(subscriber);
    this.subscribers.set(agreement.id, agreementSubscribers);
    subscriber({
      type: "agreement.updated",
      agreement
    });

    return () => {
      const currentSubscribers = this.subscribers.get(agreement.id);
      currentSubscribers?.delete(subscriber);
      if (currentSubscribers && currentSubscribers.size === 0) {
        this.subscribers.delete(agreement.id);
      }
    };
  }

  private publish(agreementId: string, event: AgreementRealtimeEvent) {
    for (const subscriber of this.subscribers.get(agreementId) ?? []) {
      subscriber(event);
    }
  }
}
