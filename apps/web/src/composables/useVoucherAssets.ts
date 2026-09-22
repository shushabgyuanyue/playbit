import { copy } from "@playbit/content";
import type { BetSession, Coupon, SessionStatus } from "@playbit/shared";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import type {
  VoucherItem,
  VoucherKind,
  VoucherSection,
  VoucherStatusFilter,
  VoucherUiStatus,
  VoucherViewFilter
} from "../types/voucher";

const statusOrder: VoucherStatusFilter[] = ["pending", "available", "used"];

export function useVoucherAssets(
  sessionsSource: MaybeRefOrGetter<BetSession[]>,
  couponsSource: MaybeRefOrGetter<Coupon[]>,
  activeView: MaybeRefOrGetter<VoucherViewFilter>
) {
  const allVoucherItems = computed(() => {
    const sessions = toValue(sessionsSource);
    const coupons = toValue(couponsSource);
    return buildVoucherItems(sessions, coupons);
  });

  const voucherItems = computed(() => {
    if (toValue(activeView) === "all") {
      return allVoucherItems.value;
    }
    return allVoucherItems.value.filter((item) => item.status === toValue(activeView));
  });

  const statusCounts = computed<Record<VoucherStatusFilter, number>>(() => ({
    pending: countByStatus(allVoucherItems.value, "pending"),
    available: countByStatus(allVoucherItems.value, "available"),
    used: countByStatus(allVoucherItems.value, "used")
  }));

  const totalCount = computed(() => allVoucherItems.value.length);
  const voucherSections = computed(() => buildVoucherSections(voucherItems.value, toValue(activeView)));

  return {
    totalCount,
    statusCounts,
    voucherItems,
    voucherSections
  };
}

export function buildVoucherItems(sessions: BetSession[], coupons: Coupon[]): VoucherItem[] {
  return buildRealVoucherItems(sessions, coupons);
}

function buildRealVoucherItems(sessions: BetSession[], coupons: Coupon[]): VoucherItem[] {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const uniqueCoupons = dedupeCouponsBySession(coupons);
  const couponSessionIds = new Set(uniqueCoupons.map((coupon) => coupon.sessionId));

  const couponItems = uniqueCoupons.map((coupon) => {
    const session = sessionMap.get(coupon.sessionId);
    const status: VoucherUiStatus = coupon.status === "used" ? "used" : "available";
    const benefit = formatVoucherBenefit(coupon.name);
    return {
      id: coupon.id,
      couponId: coupon.id,
      sessionId: coupon.sessionId,
      benefitTitle: benefit.title,
      benefitSubtitle: benefit.subtitle,
      agreementTitle: session?.title ?? coupon.description,
      agreementCode: session?.shareCode ?? coupon.sessionId.slice(-8),
      ruleText: session?.judgmentRule ?? coupon.description,
      issuerName: coupon.issuerNickname,
      holderName: coupon.holderNickname,
      timeText: formatCouponTime(coupon),
      status,
      kind: inferVoucherKind(coupon.name),
      canRedeem: status === "available"
    } satisfies VoucherItem;
  });

  const pendingItems = sessions
    .filter((session) => session.stake.type === "coupon" && !couponSessionIds.has(session.id))
    .map((session) => {
      const status = inferSessionVoucherStatus(session);
      const benefit = formatVoucherBenefit(session.stake.label);
      return {
        id: `session-${session.id}`,
        couponId: null,
        sessionId: session.id,
        benefitTitle: benefit.title,
        benefitSubtitle: benefit.subtitle,
        agreementTitle: session.title,
        agreementCode: session.shareCode,
        ruleText: session.judgmentRule,
        issuerName: inferIssuerName(session),
        holderName: inferHolderName(session),
        timeText: formatSessionStatus(session.status),
        status,
        kind: inferVoucherKind(session.stake.label),
        canRedeem: false
      } satisfies VoucherItem;
    });

  return [...couponItems, ...pendingItems].sort((left, right) => {
    const priority = { pending: 0, available: 1, used: 2 };
    return priority[left.status] - priority[right.status];
  });
}

function dedupeCouponsBySession(coupons: Coupon[]) {
  const couponMap = new Map<string, Coupon>();
  for (const coupon of coupons) {
    const existing = couponMap.get(coupon.sessionId);
    if (!existing || coupon.createdAt.localeCompare(existing.createdAt) > 0) {
      couponMap.set(coupon.sessionId, coupon);
    }
  }
  return Array.from(couponMap.values());
}

function formatVoucherBenefit(label: string) {
  const compact = label.trim();

  if (compact.includes("一杯")) {
    return {
      title: compact.replace(/^请/, "").replace("一杯", "") || compact,
      subtitle: copy.vouchers.benefitSubtitles.cup
    };
  }

  if (compact.endsWith("一次")) {
    return {
      title: compact.slice(0, -"一次".length),
      subtitle: copy.vouchers.benefitSubtitles.once
    };
  }

  if (compact.endsWith("选择权")) {
    return {
      title: compact.slice(0, -"选择权".length),
      subtitle: copy.vouchers.benefitSubtitles.choiceRight
    };
  }

  if (compact.endsWith("决定权")) {
    return {
      title: compact.slice(0, -"决定权".length),
      subtitle: copy.vouchers.benefitSubtitles.decisionRight
    };
  }

  if (compact.endsWith("路线权")) {
    return {
      title: compact.slice(0, -"路线权".length),
      subtitle: copy.vouchers.benefitSubtitles.routeRight
    };
  }

  return {
    title: compact,
    subtitle: copy.vouchers.ticketCaption
  };
}

function inferVoucherKind(label: string): VoucherKind {
  if (/洗|饭|家务|做饭|碗/.test(label)) {
    return "housework";
  }
  if (/奶茶|咖啡|请客|红包|喝|吃/.test(label)) {
    return "treat";
  }
  if (/决定|安排|选择|同意|免/.test(label)) {
    return "decision";
  }
  if (/按摩|接送|陪|服务/.test(label)) {
    return "service";
  }
  return "custom";
}

function inferSessionVoucherStatus(session: BetSession): VoucherUiStatus {
  if (session.status === "fulfilled" || session.stake.fulfilled) {
    return "used";
  }
  if (session.status === "finished") {
    return "used";
  }
  return "pending";
}

function inferIssuerName(session: BetSession) {
  const loser = session.participants.find((participant) => participant.id === session.loserId);
  const initiator = session.participants.find((participant) => participant.role === "initiator");
  return loser?.nickname ?? initiator?.nickname ?? copy.vouchers.sources.signing;
}

function inferHolderName(session: BetSession) {
  const winner = session.participants.find((participant) => participant.id === session.winnerId);
  const counterparty = session.participants.find((participant) => participant.role === "counterparty");
  return winner?.nickname ?? counterparty?.nickname ?? copy.vouchers.holderPending;
}

function formatCouponTime(coupon: Coupon) {
  if (coupon.status === "used" && coupon.usedAt) {
    return `${formatDate(coupon.usedAt)} ${copy.vouchers.redeemed}`;
  }
  return `${formatDate(coupon.createdAt)} ${copy.vouchers.received}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}${copy.vouchers.date.month}${day}${copy.vouchers.date.day} ${hour}:${minute}`;
}

function formatSessionStatus(status: SessionStatus) {
  const text: Record<SessionStatus, string> = {
    draft: copy.vouchers.sessionStatuses.draft,
    pending_confirmation: copy.vouchers.sessionStatuses.pending_confirmation,
    active: copy.vouchers.sessionStatuses.active,
    settling: copy.vouchers.sessionStatuses.settling,
    fulfilled: copy.vouchers.sessionStatuses.fulfilled,
    finished: copy.vouchers.sessionStatuses.finished
  };
  return text[status];
}

function countByStatus(items: VoucherItem[], status: VoucherStatusFilter) {
  return items.filter((item) => item.status === status).length;
}

function buildVoucherSections(items: VoucherItem[], activeView: VoucherViewFilter): VoucherSection[] {
  const statuses = activeView === "all" ? statusOrder : [activeView];
  return statuses
    .map((status) => {
      const sectionItems = items.filter((item) => item.status === status);
      return {
        status,
        title: copy.vouchers.statusTabs[status],
        count: sectionItems.length,
        items: sectionItems
      };
    })
    .filter((section) => section.count > 0);
}
