import { copy } from "@playbit/content";
import type { Agreement, Coupon } from "@playbit/shared";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import type {
  VoucherItem,
  VoucherSection,
  VoucherStatusFilter,
  VoucherUiStatus,
  VoucherViewFilter
} from "../types/voucher";
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

  const couponItems = coupons.flatMap((coupon) => {
    const agreement = coupon.agreementId ? sessionMap.get(coupon.agreementId) : undefined;
    const fallbackHolderId = agreement?.participants.find((participant) => participant.id === agreement.winnerId)?.userId;
    const isHolder = Boolean(currentUserId) && (coupon.holderUserId === currentUserId || (!coupon.holderUserId && fallbackHolderId === currentUserId));
    if (!isHolder) {
      return [];
    }
    const status: VoucherUiStatus =
      coupon.status === "used" || coupon.status === "waived"
        ? "used"
        : coupon.status === "reserved"
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
      sourceLabel: coupon.sourceLabel ?? inferCouponSourceLabel(coupon, agreement),
      signatureDataUrl: coupon.signatureDataUrl ?? agreement?.participants.find((participant) => participant.userId === coupon.issuerUserId)?.signatureDataUrl ?? null,
      agreementTitle: agreement?.title ?? coupon.description,
      agreementCode: agreement?.shareCode ?? (coupon.agreementId ? coupon.agreementId.slice(-8) : "独立发放"),
      voucherNumber: formatVoucherNumber(coupon.id),
      ruleText: agreement?.challenge ?? coupon.description,
      issuerName: coupon.issuerNickname,
      holderName: coupon.holderNickname,
      timeText: formatCouponTime(coupon),
      issuedAt: coupon.createdAt,
      redeemedAt: coupon.usedAt,
      status,
      sourceStatus: coupon.status,
      kind: inferVoucherKind(coupon.name),
      canRedeem: isHolder && status === "available",
      canDelete: false,
      issuerState: null,
      role: "holder"
    } satisfies VoucherItem];
  });

  return couponItems.sort((left, right) => {
    const priority = { pending: 0, available: 1, used: 2 };
    return priority[left.status] - priority[right.status];
  });
}

function inferCouponSourceLabel(coupon: Coupon, agreement?: Agreement) {
  if (agreement) return copy.vouchers.issueSourceOptions.promise;
  if (coupon.gameResultId) return copy.vouchers.issueSourceOptions.game;
  return copy.vouchers.issueSourceOptions.manual;
}

function formatVoucherNumber(id: string) {
  return id.slice(-10).toUpperCase();
}

function formatCouponTime(coupon: Coupon) {
  if (coupon.status === "waived" && coupon.waivedAt) {
    return `${formatDate(coupon.waivedAt)} ${copy.vouchers.waiverRecorded}`;
  }
  if (coupon.status === "used" && coupon.usedAt) {
    return `${formatDate(coupon.usedAt)} ${copy.vouchers.redeemed}`;
  }
  if (coupon.agreementId === null && !coupon.claimId) {
    return `${formatDate(coupon.createdAt)} ${copy.vouchers.received} · ${copy.vouchers.issue.remainingClaims(coupon.remainingClaims)}`;
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
