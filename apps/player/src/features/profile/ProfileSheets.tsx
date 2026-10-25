import { playerCopy as copy } from "@playbit/content/player";
import { Sheet } from "../../components/ui/Sheet";
import { usePlayer } from "../player/PlayerProvider";

export type ProfilePanel = "account" | null;

export function ProfileInfoSheet({ panel, onClose, onEdit }: { panel: Exclude<ProfilePanel, null>; onClose: () => void; onEdit: () => void }) {
  const { state } = usePlayer();
  return <Sheet open={panel === "account"} onClose={onClose} title={copy.profile.accountTitle} eyebrow="PLAYBIT ID">
    <div className="profile-info-content">
      <p className="profile-info-intro">{copy.profile.accountIntro}</p>
      <div className="profile-account-row">
        <span className="profile-account-avatar">P</span>
        <span><small>{copy.profile.name}</small><b>{state.profileName}</b></span>
        <button className="text-button" onClick={() => { onClose(); onEdit(); }}>{copy.profile.edit}</button>
      </div>
      <div className="profile-info-note"><b>{copy.profile.accountLocalTitle}</b><p>{copy.profile.accountLocalHint}</p></div>
    </div>
  </Sheet>;
}
