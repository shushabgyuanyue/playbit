import { copy } from "@playbit/content";
import type { Agreement, Coupon, AgreementStatus } from "@playbit/shared";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import type {
  VoucherItem,
  VoucherSection,
  VoucherStatusFilter,
  VoucherUiStatus,
  VoucherViewFilter
} from "../types/voucher";
import { getEffectiveStakeLabel } from "../utils/sessionDisplay";
import { formatVoucherBenefit, inferVoucherKind } from "../utils/voucherDisplay";

const statusOrder: VoucherStatusFilter[] = ["pending", "available", "used"];

export function useVoucherAssets(
  sessionsSource: MaybeRefOrGetter<Agreement[]>,
  couponsSource: MaybeRefOrGetter<Coupon[]>,
  activeView: MaybeRefOrGetter<VoucherViewFilter>,
  currentUserId: MaybeRefOrGetter<string | null>
) {
  const allVoucherItems = computed(() => {
    const agreements = toValue(sessionsSource);
    const coupons = toValue(couponsSource);
    return buildVoucherItems(agreements, coupons, toValue(currentUserId));
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

export function buildVoucherItems(
  agreements: Agreement[],
  coupons: Coupon[],
  currentUserId: string | null = null
): VoucherItem[] {
  return buildRealVoucherItems(agreements, coupons, currentUserId);
}

function buildRealVoucherItems(agreements: Agreement[], coupons: Coupon[], currentUserId: string | null): VoucherItem[] {
  const sessionMap = new Map(agreements.map((agreement) => [agreement.id, agreement]));
  const couponAgreementIds = new Set(coupons.map((coupon) => coupon.agreementId));

  const couponItems = coupons.flatMap((coupon) => {
    const agreement = sessionMap.get(coupon.agreementId);
    const fallbackHolderId = agreement?.participants.find((participant) => participant.id === agreement.winnerId)?.userId;
    const fallbackIssuerId = agreement?.participants.find((participant) => participant.id === agreement.loserId)?.userId;
    const isHolder = coupon.holderUserId === currentUserId || (!coupon.holderUserId && fallbackHolderId === currentUserId);
    const isIssuer = coupon.issuerUserId === currentUserId || (!coupon.issuerUserId && fallbackIssuerId === currentUserId);
    if (!isHolder && !isIssuer) {
      return [];
    }
    const status: VoucherUiStatus =
      coupon.status === "used" || coupon.status === "waived"
        ? "used"
        : coupon.status === "reserved" || !isHolder
          ? "pending"
          : "available";
    const benefit = formatVoucherBenefit(coupon.name);
    return [{
      id: coupon.id,
      couponId: coupon.id,
      sourceFlipId: coupon.sourceFlipId,
      agreementId: coupon.agreementId,
      benefitTitle: benefit.title,
      benefitSubtitle: coupon.status === "waived" ? copy.vouchers.waived : benefit.subtitle,
      agreementTitle: agreement?.title ?? coupon.description,
      agreementCode: agreement?.shareCode ?? coupon.agreementId.slice(-8),
      ruleText: agreement?.challenge ?? coupon.description,
      issuerName: coupon.issuerNickname,
      holderName: coupon.holderNickname,
      timeText: formatCouponTime(coupon),
      status,
      sourceStatus: coupon.status,
      kind: inferVoucherKind(coupon.name),
      canRedeem: isHolder && status === "available",
      role: isHolder ? "holder" : "issuer"
    } satisfies VoucherItem];
  });

  const pendingItems = agreements
    .filter((agreement) => {
      const loser = agreement.participants.find((participant) => participant.id === agreement.loserId);
      return (
        agreement.stake.type === "coupon" &&
        agreement.status === "result_recorded" &&
        !couponAgreementIds.has(agreement.id) &&
        loser?.userId === currentUserId
      );
    })
    .map((agreement) => {
      const status = inferSessionVoucherStatus(agreement);
      const benefit = formatVoucherBenefit(getEffectiveStakeLabel(agreement));
      return {
        id: `agreement-${agreement.id}`,
        couponId: null,
        sourceFlipId: null,
        agreementId: agreement.id,
        benefitTitle: benefit.title,
        benefitSubtitle: benefit.subtitle,
        agreementTitle: agreement.title,
        agreementCode: agreement.shareCode,
        ruleText: agreement.challenge,
        issuerName: inferIssuerName(agreement),
        holderName: inferHolderName(agreement),
        timeText: formatAgreementStatus(agreement.status),
        status,
        sourceStatus: null,
        kind: inferVoucherKind(agreement.stake.label),
        canRedeem: false,
        role: "issuer"
      } satisfies VoucherItem;
    });

  return [...couponItems, ...pendingItems].sort((left, right) => {
    const priority = { pending: 0, available: 1, used: 2 };
    return priority[left.status] - priority[right.status];
  });
}

function inferSessionVoucherStatus(agreement: Agreement): VoucherUiStatus {
  if (agreement.status === "fulfilled" || agreement.stake.fulfilled) {
    return "used";
  }
  return "pending";
}

function inferIssuerName(agreement: Agreement) {
  const loser = agreement.participants.find((participant) => participant.id === agreement.loserId);
  const initiator = agreement.participants.find((participant) => participant.role === "initiator");
  return loser?.nickname ?? initiator?.nickname ?? copy.vouchers.sources.signing;
}

function inferHolderName(agreement: Agreement) {
  const winner = agreement.participants.find((participant) => participant.id === agreement.winnerId);
  const counterparty = agreement.participants.find((participant) => participant.role === "counterparty");
  return winner?.nickname ?? counterparty?.nickname ?? copy.vouchers.holderPending;
}

function formatCouponTime(coupon: Coupon) {
  if (coupon.status === "waived" && coupon.waivedAt) {
    return `${formatDate(coupon.waivedAt)} ${copy.vouchers.waiverRecorded}`;
  }
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

function formatAgreementStatus(status: AgreementStatus) {
  const text: Record<AgreementStatus, string> = {
    pending_signature: copy.vouchers.agreementStatuses.pending_signature,
    active: copy.vouchers.agreementStatuses.active,
    result_recorded: copy.vouchers.agreementStatuses.result_recorded,
    fulfilled: copy.vouchers.agreementStatuses.fulfilled,
    waived: copy.vouchers.agreementStatuses.waived
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
