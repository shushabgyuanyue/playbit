import { playerCopy as copy } from "@playbit/content/player";
import { isLocalShareUrl, shareLink } from "../../services/linkSharing";
import { usePlayer } from "./PlayerProvider";

export function useLinkSharing() {
  const { notify } = usePlayer();
  return async (data: ShareData | null) => {
    if (!data) { notify(copy.sharing.unavailable); return; }
    try {
      const result = await shareLink(data);
      if (result === "cancelled") return;
      const copiedMessage = data.url && isLocalShareUrl(data.url) ? copy.sharing.localCopied : copy.sharing.copied;
      notify(result === "copied" ? copiedMessage : copy.sharing.opened);
    } catch {
      notify(copy.sharing.failed);
    }
  };
}
