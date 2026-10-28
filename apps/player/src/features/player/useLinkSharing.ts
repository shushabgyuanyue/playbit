import { playerCopy as copy } from "@playbit/content/player";
import { shareLink } from "../../services/linkSharing";
import { usePlayer } from "./PlayerProvider";

export function useLinkSharing() {
  const { notify } = usePlayer();
  return async (data: ShareData | null) => {
    if (!data) { notify(copy.sharing.unavailable); return; }
    try {
      const result = await shareLink(data);
      if (result !== "cancelled") notify(result === "copied" ? copy.sharing.copied : copy.sharing.opened);
    } catch {
      notify(copy.sharing.failed);
    }
  };
}
