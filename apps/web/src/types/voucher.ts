export type VoucherStatusFilter = "pending" | "available" | "used";
export type VoucherViewFilter = "all" | VoucherStatusFilter;
export type VoucherUiStatus = VoucherStatusFilter;
export type VoucherKind = "housework" | "treat" | "decision" | "service" | "custom";

export type VoucherItem = {
  id: string;
  couponId: string | null;
  sourceFlipId: string | null;
  agreementId: string | null;
  benefitTitle: string;
  benefitSubtitle: string;
  agreementTitle: string;
  agreementCode: string;
  ruleText: string;
  issuerName: string;
  holderName: string;
  timeText: string;
  status: VoucherUiStatus;
  sourceStatus: "available" | "reserved" | "used" | "waived" | null;
  kind: VoucherKind;
  canRedeem: boolean;
  role: "holder" | "issuer";
};

export type VoucherSection = {
  status: VoucherStatusFilter;
  title: string;
  count: number;
  items: VoucherItem[];
};
