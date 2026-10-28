import { playerCopy as copy } from "@playbit/content/player";

export function BenefitClaimLink({ token }: { token?: string }) {
  if (!token) return null;
  return <label className="benefit-claim-link"><span>{copy.sharing.linkLabel}</span><input aria-label={copy.sharing.linkLabel} readOnly value={`${window.location.origin}/claim/${encodeURIComponent(token)}`} onFocus={event => event.currentTarget.select()} /></label>;
}
