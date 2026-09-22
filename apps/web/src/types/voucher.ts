export type VoucherStatusFilter = "pending" | "available" | "used";
export type VoucherViewFilter = "all" | VoucherStatusFilter;
export type VoucherUiStatus = VoucherStatusFilter;
export type VoucherKind = "housework" | "treat" | "decision" | "service" | "custom";

export type VoucherItem = {
  id: string;
  couponId: string | null;
  sessionId: string | null;
  benefitTitle: string;
  benefitSubtitle: string;
  agreementTitle: string;
  agreementCode: string;
  ruleText: string;
  issuerName: string;
  holderName: string;
  timeText: string;
  status: VoucherUiStatus;
  kind: VoucherKind;
  canRedeem: boolean;
  isDemo?: boolean;
};

export type VoucherSection = {
  status: VoucherStatusFilter;
  title: string;
  count: number;
  items: VoucherItem[];
};
