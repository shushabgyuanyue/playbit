import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { CreateDeckSheet, SceneDrawer } from "../features/cards/DeckSheets";
import { ProfileInfoSheet } from "../features/profile/ProfileSheets";
import { usePlayer } from "../features/player/PlayerProvider";
import { usePageMemory } from "../services/pageMemory";

export function ProfilePage() {
  const { state, update, notify } = usePlayer();
  const { memory, remember } = usePageMemory();
  const navigate = useNavigate();
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.profile ?? 0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.profileName);
  const [sceneDrawerOpen, setSceneDrawerOpen] = useState(false);
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { profile: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);

  function saveName() {
    if (!name.trim()) return;
    update(current => ({ ...current, profileName: name.trim() }));
    setEditing(false);
    notify(copy.profile.saved);
  }

  function openDeck(deckId: string | null) {
    if (deckId) {
      const deck = state.decks.find(item => item.id === deckId);
      const firstCardId = deck?.cardIds[0];
      if (deck && firstCardId) update(current => ({ ...current, deckId, cardId: firstCardId }));
    }
    setSceneDrawerOpen(true);
  }

  function editProfile() {
    setAccountOpen(false);
    setName(state.profileName);
    setEditing(true);
  }

  return <section className="profile" ref={section}>
    <div className="profile-head">
      <span className="avatar">P</span>
      <div><small>{copy.profile.eyebrow}</small><h1>{state.profileName}</h1><p>{copy.profile.tagline}</p></div>
      <button className="profile-edit" onClick={() => { setName(state.profileName); setEditing(true); }}>{copy.profile.edit}</button>
    </div>

    <div className="profile-section-head"><span>{copy.profile.decks}</span><button type="button" onClick={() => openDeck(null)} aria-label={copy.profile.all}>{copy.profile.all}<Icon name="arrow" size={12} /></button></div>
    <div className="profile-decks">
      {state.decks.slice(0, 3).map((deck, i) => <button className={`profile-deck ${i % 2 ? "friend-deck" : "date-deck"}`} key={deck.id} onClick={() => openDeck(deck.id)}><span><Icon name={i % 2 ? "friends" : "date"} size={18} /></span><b>{deck.name}</b><small>{copy.scenes.count(deck.cardIds.length)}</small></button>)}
      {state.decks.length < 3 && <button className="profile-deck add-deck" onClick={() => setCreateDeckOpen(true)}><span>＋</span><b>{copy.scenes.add}</b><small>{copy.scenes.custom}</small></button>}
    </div>

    <div className="profile-section-head settings-title"><span>{copy.profile.services}</span></div>
    <div className="settings-group">
      <button onClick={() => navigate("/agreements")}><span className="setting-icon setting-0"><Icon name="file" size={16} /></span><span><b>{copy.promise.records}</b><small className="has-update">{copy.profile.recordsHint(state.agreements.length)}</small></span><Icon name="arrow" size={15} /></button>
      <button onClick={() => navigate("/notifications")}><span className="setting-icon setting-1"><Icon name="bell" size={16} /></span><span><b>{copy.profile.notificationTitle}</b><small>{copy.profile.notificationHint}</small></span><Icon name="arrow" size={15} /></button>
      <button onClick={() => setAccountOpen(true)}><span className="setting-icon setting-2"><Icon name="user" size={16} /></span><span><b>{copy.profile.accountTitle}</b><small>{copy.profile.accountHint}</small></span><Icon name="arrow" size={15} /></button>
      <button onClick={() => navigate("/announcements")}><span className="setting-icon setting-3"><Icon name="file" size={16} /></span><span><b>{copy.profile.announcementTitle}</b><small>{copy.profile.announcementHint}</small></span><Icon name="arrow" size={15} /></button>
    </div>
    <span className="app-version">{copy.profile.version}</span>

    <SceneDrawer open={sceneDrawerOpen} onClose={() => setSceneDrawerOpen(false)} onCreate={() => setCreateDeckOpen(true)} />
    <CreateDeckSheet open={createDeckOpen} onClose={() => setCreateDeckOpen(false)} />
    {accountOpen && <ProfileInfoSheet panel="account" onClose={() => setAccountOpen(false)} onEdit={editProfile} />}
    <Sheet open={editing} onClose={() => setEditing(false)} title={copy.profile.editTitle}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); saveName(); }}><label>{copy.profile.name}<input value={name} onChange={e => setName(e.target.value)} maxLength={24} required /></label><button className="primary-button">{copy.save}</button></form>
    </Sheet>
  </section>;
}
