import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import type { VoucherKind } from "../types/voucher";

export function formatVoucherBenefit(label: string): { title: string; subtitle: string } {
  const compact = label.trim();
  const parts = compact
    .split("；")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    const base = formatVoucherBenefit(parts[0]);
    return {
      title: base.title,
      subtitle: `${copy.vouchers.benefitSubtitles.additions} ${parts.length - 1}`
    };
  }

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

export function inferVoucherKind(label: string): VoucherKind {
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

export function inferStakeVoucherKind(stake: Stake): VoucherKind {
  if (stake.type === "point") {
    return "decision";
  }
  if (stake.type === "custom") {
    return "custom";
  }
  return inferVoucherKind(stake.label);
}
