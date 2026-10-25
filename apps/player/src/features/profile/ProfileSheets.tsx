import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { cards } from "../../data/demo";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { usePlayer } from "../player/PlayerProvider";

const deckIcons = ["date", "friends", "moon", "home"] as const;

export function ProfileSceneDrawer({ open, onClose, onCreate, selectedDeckId }: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  selectedDeckId: string | null;
}) {
  const { state } = usePlayer();
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(selectedDeckId);

  useEffect(() => {
    if (!open) return;
    setExpandedDeckId(selectedDeckId ?? state.decks[0]?.id ?? null);
  }, [open, selectedDeckId, state.decks]);

  return <Sheet open={open} onClose={onClose} variant="drawer" title={copy.profile.all} eyebrow="MY SCENES" description={copy.profile.decksHint}>
    <div className="profile-drawer-list">
      {state.decks.length === 0 && <div className="profile-drawer-empty"><Icon name="folder" size={22} /><b>{copy.scenes.empty}</b><small>{copy.scenes.custom}</small></div>}
      {state.decks.map((deck, index) => {
        const deckCards = deck.cardIds.map(cardId => cards.find(card => card.id === cardId)).filter(Boolean);
        const expanded = expandedDeckId === deck.id;
        return <div className={`profile-drawer-deck ${expanded ? "expanded" : ""}`} key={deck.id}>
          <button className="profile-drawer-deck-head" onClick={() => setExpandedDeckId(expanded ? null : deck.id)} aria-expanded={expanded}>
            <span className={`profile-deck-glyph deck-glyph-${index % deckIcons.length}`}><Icon name={deckIcons[index % deckIcons.length]} size={17} /></span>
            <span><b>{deck.name}</b><small>{copy.scenes.count(deck.cardIds.length)}</small></span>
            <Icon name="arrow" size={15} />
          </button>
          {expanded && <div className="profile-drawer-cards">
            {deckCards.length > 0 ? deckCards.map(card => <article className="profile-drawer-card" key={card!.id}><span>{card!.label}</span><p>{card!.prompt}{card!.kicker}</p></article>) : <p className="profile-drawer-empty-copy">{copy.scenes.emptyDeck}</p>}
          </div>}
        </div>;
      })}
    </div>
    <button className="profile-drawer-create" onClick={() => { onClose(); onCreate(); }}><span>＋</span><span><b>{copy.scenes.create}</b><small>{copy.scenes.custom}</small></span><Icon name="arrow" size={16} /></button>
  </Sheet>;
}

export type ProfilePanel = "notifications" | "account" | "announcement" | null;

export function ProfileInfoSheet({ panel, onClose, onEdit }: { panel: Exclude<ProfilePanel, null>; onClose: () => void; onEdit: () => void }) {
  const { state } = usePlayer();
  const titles = { notifications: copy.profile.notificationTitle, account: copy.profile.accountTitle, announcement: copy.profile.announcementTitle };
  const eyebrows = { notifications: "PLAYBIT UPDATES", account: "PLAYBIT ID", announcement: "PLAYBIT NOTE" };
  return <Sheet open={!!panel} onClose={onClose} title={titles[panel]} eyebrow={eyebrows[panel]}>
    {panel === "notifications" && <div className="profile-info-content"><p className="profile-info-intro">{copy.profile.notificationIntro}</p><div className="profile-info-empty"><Icon name="bell" size={21} /><b>{copy.profile.notificationEmpty}</b><small>{copy.profile.notifications}</small></div></div>}
    {panel === "account" && <div className="profile-info-content"><p className="profile-info-intro">{copy.profile.accountIntro}</p><div className="profile-account-row"><span className="profile-account-avatar">P</span><span><small>{copy.profile.name}</small><b>{state.profileName}</b></span><button className="text-button" onClick={() => { onClose(); onEdit(); }}>{copy.profile.edit}</button></div><div className="profile-info-note"><b>{copy.profile.accountLocalTitle}</b><p>{copy.profile.accountLocalHint}</p></div></div>}
    {panel === "announcement" && <div className="profile-info-content"><p className="profile-info-intro">{copy.profile.announcementIntro}</p><div className="profile-announcement-list">{copy.profile.announcementItems.map(item => <p key={item}><Icon name="check" size={15} /><span>{item}</span></p>)}</div></div>}
  </Sheet>;
}
