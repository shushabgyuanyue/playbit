export function publicInvitationUrl(kind: "share" | "game" | "flip", code: string): URL {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  const url = new URL(configured || `${window.location.origin}${window.location.pathname}`);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid public site URL");
  }
  url.search = "";
  url.hash = "";
  url.searchParams.set(kind, code);
  return url;
}
