import { useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { cards, scenes } from "../../data/demo";
import { EXPLORE_SCENE_ID } from "../../data/catalog";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { usePlayer } from "../player/PlayerProvider";

function firstCardForScene(sceneId: string) {
  return sceneId === EXPLORE_SCENE_ID
    ? cards.find(card => card.sceneIds.length > 0 || card.gameplayId) ?? cards[0]!
    : cards.find(card => card.sceneIds.includes(sceneId)) ?? cards[0]!;
}

export function CreateDeckSheet({ open, onClose, cardId }: { open: boolean; onClose: () => void; cardId?: string }) {
  const [name, setName] = useState("");
  const { state, update, notify } = usePlayer();
  function create() {
    const title = name.trim();
    if (!title) return;
    if (state.decks.some(d => d.name === title)) { notify(copy.scenes.duplicate); return; }
    update(current => ({ ...current, decks: [...current.decks, { id: crypto.randomUUID(), name: title, cardIds: cardId ? [cardId] : [] }] }));
    notify(cardId ? copy.collection.saved(title) : copy.scenes.created);
    setName(""); onClose();
  }
  return <Sheet open={open} onClose={onClose} title={copy.scenes.createTitle} eyebrow="MY SCENE">
    <form onSubmit={event => { event.preventDefault(); create(); }} className="sheet-form">
      <label>{copy.scenes.name}<input value={name} maxLength={24} onChange={e => setName(e.target.value)} placeholder={copy.scenes.namePlaceholder} required /></label>
      <button className="primary-button" disabled={!name.trim()}>{copy.scenes.create}</button>
    </form>
  </Sheet>;
}

export function SceneDrawer({ open, onClose, onCreate, onSceneChange }: { open: boolean; onClose: () => void; onCreate: () => void; onSceneChange?: () => void }) {
  const { state, update, notify } = usePlayer();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  function select(sceneId: string, name: string, deckId: string | null = null) {
    const deck = state.decks.find(d => d.id === deckId);
    if (deck && !deck.cardIds.length) { notify(copy.scenes.emptyDeck); return; }
    const first = deck ? cards.find(c => deck.cardIds.includes(c.id)) ?? cards[0]! : firstCardForScene(sceneId);
    update(current => ({ ...current, sceneId, deckId, cardId: first.id }));
    onSceneChange?.();
    onClose(); notify(copy.scenes.switched(name));
  }
  function deleteDeck() {
    if (!deleteTarget) return;
    update(current => ({ ...current, decks: current.decks.filter(item => item.id !== deleteTarget), ...(current.deckId === deleteTarget ? { deckId: null, cardId: firstCardForScene(current.sceneId).id } : {}) }));
    setDeleteTarget(null);
    notify(copy.scenes.deleted);
  }
  const targetDeck = deleteTarget ? state.decks.find(deck => deck.id === deleteTarget) : null;
  return <>
    <Sheet open={open} onClose={onClose} variant="drawer" title={copy.scenes.title} eyebrow={copy.scenes.eyebrow} description={copy.scenes.hint}>
    <div className="scene-section"><div className="section-label"><span>{copy.scenes.official}</span><b>{scenes.length + 1}</b></div><div className="scene-grid">
      <button className={`scene-tile explore-tile ${!state.deckId && state.sceneId === EXPLORE_SCENE_ID ? "selected" : ""}`} aria-pressed={!state.deckId && state.sceneId === EXPLORE_SCENE_ID} onClick={() => select(EXPLORE_SCENE_ID, copy.scenes.explore)}><span className="scene-glyph"><Icon name="spark" /></span><b>{copy.scenes.explore}</b></button>
      {scenes.map(scene => <button key={scene.id} className={`scene-tile ${!state.deckId && state.sceneId === scene.id ? "selected" : ""}`} aria-pressed={!state.deckId && state.sceneId === scene.id} onClick={() => select(scene.id, scene.title)}><span className="scene-glyph"><Icon name={scene.icon} /></span><b>{scene.title}</b></button>)}
    </div></div>
    <div className="scene-section custom-section"><div className="section-label"><span>{copy.scenes.mine}</span><b>{state.decks.length}</b></div><div className="scene-grid">
      {state.decks.map(deck => <div className="scene-tile-wrap" key={deck.id}><button className={`scene-tile custom ${state.deckId === deck.id ? "selected" : ""}`} aria-pressed={state.deckId === deck.id} onClick={() => select(state.sceneId, deck.name, deck.id)}><span className="scene-glyph"><Icon name="folder" /></span><b>{deck.name}</b><small>{copy.scenes.count(deck.cardIds.length)}</small></button><button className="scene-delete" type="button" aria-label={`删除${deck.name}`} onClick={() => setDeleteTarget(deck.id)}><Icon name="close" size={12} /></button></div>)}
      <button className="scene-tile custom add-tile" onClick={() => { onClose(); onCreate(); }}><span className="scene-glyph">＋</span><b>{copy.scenes.create}</b></button>
    </div></div>
    </Sheet>
    <Sheet open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={copy.scenes.deleteTitle} description={copy.scenes.deleteHint}>
      <div className="delete-deck-preview"><span><Icon name="folder" size={18} /></span><b>{targetDeck?.name ?? "场景卡组"}</b></div>
      <div className="sheet-actions"><button className="text-button" type="button" onClick={() => setDeleteTarget(null)}>{copy.cancel}</button><button className="danger-button" type="button" onClick={deleteDeck}>{copy.scenes.deleteAction}</button></div>
    </Sheet>
  </>;
}

export function CollectionSheet({ open, onClose, cardId, onCreate }: { open: boolean; onClose: () => void; cardId: string; onCreate: () => void }) {
  const { state, update, notify } = usePlayer();
  const activeDeckId = state.deckId;
  function toggleSave(deckId: string) {
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck) return;
    const saved = deck.cardIds.includes(cardId);
    const canRemove = activeDeckId === deckId;
    if (saved && !canRemove) return;
    update(current => {
      const nextDecks = current.decks.map(d => d.id === deckId ? { ...d, cardIds: saved ? d.cardIds.filter(id => id !== cardId) : [...d.cardIds, cardId] } : d);
      if (saved && current.deckId === deckId && deck.cardIds.length === 1) {
        const fallback = cards.find(card => card.sceneIds.includes(current.sceneId)) ?? cards[0]!;
        return { ...current, decks: nextDecks, deckId: null, cardId: fallback.id };
      }
      return { ...current, decks: nextDecks };
    });
    onClose(); notify(saved ? copy.collection.removed(deck.name) : copy.collection.saved(deck.name));
  }
  return <Sheet open={open} onClose={onClose} title={copy.collection.title} eyebrow={copy.collection.eyebrow}>
    {state.decks.map((deck, i) => {
      const savedInDeck = deck.cardIds.includes(cardId);
      const canRemove = activeDeckId === deck.id;
      return <button className={`save-option ${savedInDeck ? "is-saved" : ""} ${savedInDeck && !canRemove ? "is-locked" : ""}`} key={deck.id} onClick={() => toggleSave(deck.id)} disabled={savedInDeck && !canRemove} aria-pressed={savedInDeck} aria-label={`${deck.name}${savedInDeck ? canRemove ? "，取消收藏" : "，已收藏" : "，收藏"}`}><span className={`mini-cover cover-${i % 2}`}><Icon name={savedInDeck ? "check" : "bookmark"} size={18} /></span><span><b>{deck.name}</b><small>{savedInDeck ? "已收藏 · " : ""}{copy.scenes.count(deck.cardIds.length)}</small></span><Icon name={savedInDeck ? "check" : "arrow"} size={18} /></button>;
    })}
    <button className="save-option" onClick={() => { onClose(); onCreate(); }}><span className="mini-cover cover-2"><Icon name="spark" size={18} /></span><span><b>{copy.collection.create}</b><small>{copy.collection.newHint}</small></span><Icon name="arrow" size={18} /></button>
  </Sheet>;
}

export function AiSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { update, notify } = usePlayer();
  function select() {
    if (!query.trim()) return;
    const id = /洗碗|家务|水槽/.test(query) ? "dishes" : /店|商家|活动|广告|咖啡/.test(query) ? "shop" : /等车|候车|等位|排队|五分钟|5分钟/.test(query) ? "wait" : /睡前|深夜|晚上/.test(query) ? "night" : /家人|家庭|回家/.test(query) ? "family" : /初次|刚认识|害羞|尴尬/.test(query) ? "hello" : /朋友|四个|聚会|多人|饭后/.test(query) ? "friends" : "date";
    update(current => ({ ...current, sceneId: id, deckId: null, cardId: cards.find(c => c.sceneIds.includes(id))!.id }));
    notify(copy.scenes.switched(scenes.find(s => s.id === id)!.title));
    setQuery(""); onClose();
  }
  return <Sheet open={open} onClose={onClose} title={copy.ai.title} eyebrow={copy.ai.eyebrow} description={copy.ai.hint}>
    <form className="prompt-box" onSubmit={e => { e.preventDefault(); select(); }}><textarea aria-label={copy.ai.title} value={query} onChange={e => setQuery(e.target.value)} placeholder={copy.ai.placeholder} maxLength={300} /><button disabled={!query.trim()} aria-label={copy.ai.send}><Icon name="send" size={19} /></button></form>
    <div className="chips">{copy.ai.suggestions.map(q => <button key={q} onClick={() => setQuery(q)}>{q}</button>)}</div>
  </Sheet>;
}
