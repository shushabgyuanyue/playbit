import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
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
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { profile: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);
  function saveName() { if (!name.trim()) return; update(current => ({ ...current, profileName: name.trim() })); setEditing(false); notify(copy.profile.saved); }
  return <section className="profile" ref={section}><div className="profile-head"><span className="avatar">P</span><div><small>{copy.profile.eyebrow}</small><h1>{state.profileName}</h1><p>{copy.profile.tagline}</p></div><button className="profile-edit" onClick={() => { setName(state.profileName); setEditing(true); }}>{copy.profile.edit}</button></div>
    <div className="profile-section-head"><span>{copy.profile.decks}</span><button type="button" onClick={() => navigate("/")} aria-label={copy.profile.all}>{copy.profile.all}<Icon name="arrow" size={12} /></button></div>
    <div className="profile-decks">{state.decks.slice(0, 3).map((deck, i) => <button className={`profile-deck ${i % 2 ? "friend-deck" : "date-deck"}`} key={deck.id} onClick={() => notify(`${deck.name} · ${copy.scenes.count(deck.cardIds.length)}`)}><span><Icon name={i % 2 ? "friends" : "date"} size={18} /></span><b>{deck.name}</b><small>{copy.scenes.count(deck.cardIds.length)}</small></button>)}<button className="profile-deck add-deck" onClick={() => notify(copy.scenes.empty)}><span>＋</span><b>{copy.scenes.add}</b><small>{copy.scenes.custom}</small></button></div>
    <div className="profile-section-head settings-title"><span>{copy.profile.services}</span></div><div className="settings-group">
      <button onClick={() => state.agreements[0] ? navigate(`/agreements/${state.agreements[0].id}`) : notify(copy.profile.recordsHint(0))}><span className="setting-icon setting-0"><Icon name="file" size={16} /></span><span><b>{copy.promise.records}</b><small className="has-update">{copy.profile.recordsHint(state.agreements.length)}</small></span><Icon name="arrow" size={15} /></button>
      <button onClick={() => notify(copy.profile.notifications)}><span className="setting-icon setting-1"><Icon name="bell" size={16} /></span><span><b>{copy.profile.notificationTitle}</b><small className="has-update">{copy.profile.notificationHint}</small></span><Icon name="arrow" size={15} /></button>
      <button onClick={() => notify(copy.profile.accountTitle)}><span className="setting-icon setting-2"><Icon name="user" size={16} /></span><span><b>{copy.profile.accountTitle}</b><small>{copy.profile.accountHint}</small></span><Icon name="arrow" size={15} /></button>
      <button onClick={() => notify(copy.profile.securityTitle)}><span className="setting-icon setting-3"><Icon name="shield" size={16} /></span><span><b>{copy.profile.securityTitle}</b><small>{copy.profile.securityHint}</small></span><Icon name="arrow" size={15} /></button>
    </div><span className="app-version">{copy.profile.version}</span>
    <Sheet open={editing} onClose={() => setEditing(false)} title={copy.profile.editTitle}><form className="sheet-form" onSubmit={e => { e.preventDefault(); saveName(); }}><label>{copy.profile.name}<input value={name} onChange={e => setName(e.target.value)} maxLength={24} required /></label><button className="primary-button">{copy.save}</button></form></Sheet>
  </section>;
}
