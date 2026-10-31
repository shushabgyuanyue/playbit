import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { useLinkSharing } from "../features/player/useLinkSharing";
import { benefitShareData } from "../services/linkSharing";
import { cards, scenes } from "../data/demo";
import { EXPLORE_SCENE_ID } from "../data/catalog";
import { gameplays, type GameplayId } from "../data/catalog/gameplays";
import { Icon } from "../components/ui/Icon";
import { AiSheet, CollectionSheet, CreateDeckSheet, SceneDrawer } from "../features/cards/DeckSheets";
import { GameCard } from "../features/cards/GameCard";
import type { CardPalette } from "../features/cards/CardMedia";
import { FeedNeighbors } from "../features/cards/FeedNeighbors";
import { IssueStakeSheet } from "../features/cards/IssueStakeSheet";
import { STAKE_NAV_ACTION } from "../features/cards/StakeNavControl";
import { getPendingStakeRecords, StakeRecordsSheet, STAKE_RECORD_TTL_MS } from "../features/cards/StakeRecordsSheet";
import { CARD_MOVE_MS, useCardDeck } from "../features/cards/useCardDeck";
import { useFeedSwipe } from "../features/cards/useFeedSwipe";
import { usePlayer } from "../features/player/PlayerProvider";
import { AuthSheet } from "../features/player/AuthSheet";
import { claimGameStake, createId, issueGameStake } from "../features/player/transitions";
import type { StakeRecord, VoiceNote } from "../data/types";
import { usePageMemory } from "../services/pageMemory";
import { isPlayerApiConfigured, normalizeCouponDescription, normalizeCouponName, PlayerApiError, playerApi } from "../services/playerApi";

type Panel = "scene" | "ai" | "records" | "save" | "issue" | "new" | "new-and-save" | null;
type ModeTransition = "enter-out" | "enter-in" | "exit-out" | "exit-in" | "";

export function PlayPage() {
  const shareLink = useLinkSharing();
  const { state, update, notify, auth } = usePlayer();
  const { memory, remember } = usePageMemory();
  const typeMode = memory.playMode;
  const { card, pool, flipped, setFlipped, slide, go } = useCardDeck(memory.playFlippedCardId, typeMode);
  const [cardPalette, setCardPalette] = useState<CardPalette | null>(null);
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const [pendingSaveCardId, setPendingSaveCardId] = useState<string | null>(null);
  const [likedCards, setLikedCards] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("playbit-liked-cards") ?? "[]") as string[]); } catch { return new Set(); }
  });
  const [showGestureGuide, setShowGestureGuide] = useState(() => {
    try { return localStorage.getItem("playbit-feed-gesture-seen") !== "1"; } catch { return true; }
  });
  const [issueNudge, setIssueNudge] = useState<StakeRecord | null>(null);
  const issueNudgeTimer = useRef<number | null>(null);
  const [pendingIssueCardId, setPendingIssueCardId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingStakeVoice, setPendingStakeVoice] = useState<VoiceNote | null>(null);
  const [modeTransition, setModeTransition] = useState<ModeTransition>("");
  const modeTimer = useRef<number | null>(null);
  const scene = typeMode
    ? copy.play.sameType(gameplays[typeMode].name)
    : state.decks.find(d => d.id === state.deckId)?.name ?? (state.sceneId === EXPLORE_SCENE_ID ? copy.scenes.explore : scenes.find(s => s.id === state.sceneId)?.title ?? scenes[0]!.title);
  const stake = state.stakes[card.id];
  const stakeVoice = state.stakeVoices[card.id];
  const issuance = state.issuedStakes[card.id] ?? null;
  const feedDark = cardPalette?.dark ?? "#09090c";
  const pendingStakeRecords = getPendingStakeRecords(state);
  const currentDeck = state.decks.find(deck => deck.id === state.deckId) ?? null;
  const alreadySaved = state.decks.some(deck => deck.cardIds.includes(card.id));
  const savedInCurrentContext = currentDeck ? currentDeck.cardIds.includes(card.id) : alreadySaved;
  const saved = savedInCurrentContext || pendingSaveCardId === card.id;
  const typeModeAvailable = Boolean(card.gameplayId && cards.filter(item => item.gameplayId === card.gameplayId).length > 1);
  useEffect(() => () => {
    if (modeTimer.current) window.clearTimeout(modeTimer.current);
    if (issueNudgeTimer.current) window.clearTimeout(issueNudgeTimer.current);
  }, []);
  function finishModeTransition() {
    modeTimer.current = window.setTimeout(() => setModeTransition(""), CARD_MOVE_MS);
  }
  function enterTypeMode() {
    if (!card.gameplayId || !typeModeAvailable || typeMode || modeTransition) return;
    const gameplayId = card.gameplayId as GameplayId;
    setModeTransition("enter-out");
    modeTimer.current = window.setTimeout(() => {
      remember({ playMode: gameplayId });
      setFlipped(false);
      setModeTransition("enter-in");
      finishModeTransition();
      notify(copy.play.typeModeEntered(gameplays[gameplayId].name));
    }, CARD_MOVE_MS);
  }
  function leaveTypeMode() {
    if (!typeMode || modeTransition) return;
    setModeTransition("exit-out");
    modeTimer.current = window.setTimeout(() => {
      remember({ playMode: null });
      setFlipped(false);
      setModeTransition("exit-in");
      finishModeTransition();
      notify(copy.play.typeModeExited);
    }, CARD_MOVE_MS);
  }
  const contextKey = `${state.sceneId}:${state.deckId ?? ""}`;
  const previousContextKey = useRef(contextKey);
  useEffect(() => {
    if (previousContextKey.current === contextKey) return;
    previousContextKey.current = contextKey;
    if (memory.playMode) remember({ playMode: null });
  }, [contextKey, memory.playMode, remember]);
  function revealCard() {
    if (flipped) return;
    if (stake) {
      update(current => {
        const currentRecord = current.stakeRecords[card.id];
        return {
          ...current,
          stakeRecords: {
            ...(current.stakeRecords ?? {}),
            [card.id]: {
              cardId: card.id,
              title: current.stakes[card.id] ?? stake,
              createdAt: currentRecord?.createdAt ?? new Date().toISOString(),
              locked: true
            }
          }
        };
      });
    }
    setFlipped(true);
  }
  const swipe = useFeedSwipe(slide, card.id, moveCard, {
    onHoldFlip: revealCard,
    onHoldCollect: collectCard,
    onTap: () => {
      if (flipped) setFlipped(false);
    },
    onSwipeLeft: typeMode ? undefined : enterTypeMode,
    onSwipeRight: typeMode ? leaveTypeMode : undefined,
    canHold: () => !flipped,
    onGestureStart: () => {
      setShowGestureGuide(false);
      try { localStorage.setItem("playbit-feed-gesture-seen", "1"); } catch { /* local storage is optional */ }
    }
  });
  const close = () => {
    if (panel === "save" && !savedInCurrentContext) setPendingSaveCardId(null);
    setPanel(null);
  };
  useEffect(() => {
    if (savedInCurrentContext && pendingSaveCardId === card.id) setPendingSaveCardId(null);
  }, [savedInCurrentContext, card.id, pendingSaveCardId]);
  useEffect(() => {
    const now = Date.now();
    const stakeIds = new Set([...Object.keys(state.stakes), ...Object.keys(state.stakeVoices), ...Object.keys(state.stakeRecords ?? {})]);
    const nextExpiry = Object.values(state.stakeRecords ?? {}).map(record => Date.parse(record.createdAt) + STAKE_RECORD_TTL_MS).filter(value => Number.isFinite(value) && value > now).sort((a, b) => a - b)[0];
    if (stakeIds.size) {
      update(current => {
        const stakeRecords = { ...(current.stakeRecords ?? {}) };
        const stakes = { ...current.stakes };
        const stakeVoices = { ...current.stakeVoices };
        let changed = false;
        for (const cardId of stakeIds) {
          const record = stakeRecords[cardId];
          const title = stakes[cardId];
          const voice = stakeVoices[cardId];
          const issued = Boolean(current.issuedStakes[cardId]);
          const createdAt = record ? Date.parse(record.createdAt) : NaN;
          const expired = Boolean(record) && (!Number.isFinite(createdAt) || now - createdAt >= STAKE_RECORD_TTL_MS);
          if (issued) {
            if (record) { delete stakeRecords[cardId]; changed = true; }
          } else if (expired || !title || !voice?.assetId) {
            if (record) { delete stakeRecords[cardId]; changed = true; }
            if (title) { delete stakes[cardId]; changed = true; }
            if (voice) { delete stakeVoices[cardId]; changed = true; }
          } else if (!record) {
            stakeRecords[cardId] = { cardId, title, createdAt: new Date().toISOString(), locked: false };
            changed = true;
          } else if (record.title !== title) {
            stakeRecords[cardId] = { ...record, title };
            changed = true;
          }
        }
        return changed ? { ...current, stakes, stakeVoices, stakeRecords } : current;
      });
    }
    if (!nextExpiry) return;
    const timer = window.setTimeout(() => update(current => ({ ...current })), Math.max(100, nextExpiry - now + 50));
    return () => window.clearTimeout(timer);
  }, [state.issuedStakes, state.stakeRecords, state.stakes, update]);
  useEffect(() => {
    if (pendingIssueCardId !== card.id) return;
    setPendingIssueCardId(null);
    setPanel("issue");
  }, [card.id, pendingIssueCardId]);
  useEffect(() => {
    if (!issueNudge) return;
    const timer = window.setTimeout(() => {
      setIssueNudge(null);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [issueNudge]);
  useEffect(() => {
    remember({ playFlippedCardId: flipped ? card.id : null });
  }, [card.id, flipped, remember]);
  function handleStakeDelete(cardId: string) {
    window.dispatchEvent(new CustomEvent(STAKE_NAV_ACTION, { detail: { action: "clear", cardId } }));
    if (cardId !== card.id) return;
    setFlipped(false);
    remember({ playFlippedCardId: null });
  }
  function openCollection() {
    if (currentDeck?.cardIds.includes(card.id)) {
      const nextCard = cards.find(item => item.id !== card.id && currentDeck.cardIds.includes(item.id))
        ?? cards.find(item => item.sceneIds.includes(state.sceneId))
        ?? cards[0]!;
      update(current => ({
        ...current,
        decks: current.decks.map(deck => deck.id === currentDeck.id ? { ...deck, cardIds: deck.cardIds.filter(id => id !== card.id) } : deck),
        ...(currentDeck.cardIds.length === 1
          ? { deckId: null, cardId: nextCard.id }
          : { cardId: nextCard.id })
      }));
      notify(copy.collection.removed(currentDeck.name));
      return;
    }
    if (!currentDeck && !alreadySaved) setPendingSaveCardId(card.id);
    setPanel("save");
  }
  function collectCard() {
    const deck = currentDeck;
    if (!deck) { openCollection(); return; }
    if (deck.cardIds.includes(card.id)) { notify(copy.collection.already); return; }
    update(current => ({ ...current, decks: current.decks.map(item => item.id === deck.id && !item.cardIds.includes(card.id) ? { ...item, cardIds: [...item.cardIds, card.id] } : item) }));
    notify(copy.collection.saved(deck.name));
  }
  function toggleLike() {
    setLikedCards(current => {
      const next = new Set(current);
      if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
      try { localStorage.setItem("playbit-liked-cards", JSON.stringify([...next])); } catch { /* local storage is optional */ }
      return next;
    });
    notify(likedCards.has(card.id) ? copy.play.unliked : copy.play.liked);
  }
  function commentCard() {
    notify(copy.play.commentUnavailable);
  }
  async function shareCard() {
    const data: ShareData = {
      title: card.label,
      text: `${card.prompt}\n${card.kicker}\n${card.payoff}`,
      url: `${window.location.origin}/?card=${encodeURIComponent(card.id)}`
    };
    await shareLink(data);
  }
  function openIssue() {
    setIssueNudge(null);
    if (!stake) return;
    setPanel("issue");
  }
  function openStakeRecord(record: StakeRecord) {
    const target = cards.find(item => item.id === record.cardId);
    if (!target) return;
    setIssueNudge(null);
    const deck = state.decks.find(item => item.cardIds.includes(record.cardId));
    setPendingIssueCardId(record.cardId);
    update(current => ({ ...current, deckId: deck?.id ?? null, sceneId: deck ? current.sceneId : target.sceneIds[0] ?? current.sceneId, cardId: record.cardId }));
    setPanel(null);
  }
  function moveCard(direction: number) {
    if (slide || modeTransition || pool.length < 2) return false;
    if (issueNudgeTimer.current) window.clearTimeout(issueNudgeTimer.current);
    setIssueNudge(null);
    if (stake && !issuance) {
      const record = { cardId: card.id, title: stake, createdAt: state.stakeRecords[card.id]?.createdAt ?? new Date().toISOString(), locked: state.stakeRecords[card.id]?.locked === true };
      update(current => ({ ...current, stakeRecords: { ...(current.stakeRecords ?? {}), [card.id]: record } }));
      issueNudgeTimer.current = window.setTimeout(() => {
        issueNudgeTimer.current = null;
        setIssueNudge(record);
      }, CARD_MOVE_MS + 40);
    }
    go(direction);
    return true;
  }
  async function persistGameStake(voice: VoiceNote) {
    if (!stake || issuance) return;
    const displayStake = normalizeCouponName(voice.transcript ?? stake, stake);
    if (isPlayerApiConfigured()) {
      try {
        const result = await playerApi.createIndependentCoupon({
          name: displayStake,
          description: normalizeCouponDescription(displayStake, stake),
          sourceLabel: copy.wallet.issueSourceOptions.game,
          gameResultId: null,
          signatureDataUrl: null,
          claimLimit: 1
        });
        const remoteIssuance = result.coupon;
        const created = {
          id: remoteIssuance.id,
          remoteId: remoteIssuance.id,
          claimToken: remoteIssuance.claimToken ?? undefined,
          cardId: card.id,
          cardTitle: card.label,
          title: remoteIssuance.name,
          issuerName: remoteIssuance.issuerNickname,
          signature: [],
          voice,
          issuedAt: remoteIssuance.createdAt,
          source: "game" as const,
          status: "pending_claim" as const
        };
        update(current => {
          const stakeRecords = { ...(current.stakeRecords ?? {}) };
          delete stakeRecords[card.id];
          return {
            ...current,
            stakeRecords,
            stakeVoices: { ...current.stakeVoices, [card.id]: voice },
            issuedStakes: {
              ...current.issuedStakes,
              [card.id]: created
            }
          };
        });
        setPanel(null);
        await shareLink(benefitShareData(created, card.label));
        return;
      } catch (error) {
        if (error instanceof PlayerApiError && error.status === 401) {
          auth.logout();
          setPendingStakeVoice(voice);
          setAuthOpen(true);
          return;
        }
        notify(error instanceof PlayerApiError && error.status === 0 ? copy.auth.network : copy.play.issueStake);
        return;
      }
    }
    const issuedAt = new Date().toISOString();
    const issuanceId = createId("stake");
    const next = issueGameStake({ ...state, stakeVoices: { ...state.stakeVoices, [card.id]: voice } }, card.id, card.label, displayStake, state.profileName, voice, issuedAt, issuanceId);
    const created = next.issuedStakes[card.id];
    update(current => issueGameStake({ ...current, stakeVoices: { ...current.stakeVoices, [card.id]: voice } }, card.id, card.label, displayStake, current.profileName, voice, issuedAt, issuanceId));
    setPanel(null);
    await shareLink(benefitShareData(created ?? null, card.label));
  }

  function signStake(voice: VoiceNote) {
    if (!stake || issuance) return;
    if (isPlayerApiConfigured() && !auth.user) {
      setPendingStakeVoice(voice);
      setAuthOpen(true);
      return;
    }
    void persistGameStake(voice);
  }
  function continuePendingStake() {
    const voice = pendingStakeVoice;
    setPendingStakeVoice(null);
    if (voice) void persistGameStake(voice);
  }
  async function shareStake() {
    await shareLink(benefitShareData(issuance, issuance?.cardTitle));
  }
  useEffect(() => {
    const handleStakeNavAction = (event: Event) => {
      const action = (event as CustomEvent<{ action?: "issue" | "share" }>).detail?.action;
      if (action === "issue") openIssue();
      if (action === "share") void shareStake();
    };
    window.addEventListener(STAKE_NAV_ACTION, handleStakeNavAction);
    return () => window.removeEventListener(STAKE_NAV_ACTION, handleStakeNavAction);
  }, [card.id, issuance, stake]);
  function selfClaimStake() {
    if (!issuance) return;
    update(current => claimGameStake(current, issuance.id, current.profileName));
    setPanel(null);
    navigate("/benefits", { replace: true });
    notify(copy.play.issueStakeClaimed);
  }
  return <>
    <div className="feed-toolbar" style={{ "--feed-dark": feedDark } as CSSProperties}>
      <button className="feed-scene" onClick={() => setPanel("scene")} aria-label={`${copy.play.scene}：${scene}`}><Icon name="grid" size={15} /><span>{scene}</span><Icon name="chevronDown" size={12} /></button>
      <button className="feed-tool feed-ai" onClick={() => setPanel("ai")} aria-label={copy.play.ai} title={copy.play.ai}><Icon name="spark" size={14} /><span className="feed-tool-prompt">{copy.play.ai}</span></button>
      <button className="feed-tool feed-records" onClick={() => setPanel("records")} aria-label={copy.play.stakeRecords} title={copy.play.stakeRecords}><Icon name="trophy" size={16} />{pendingStakeRecords.length > 0 && <i>{pendingStakeRecords.length}</i>}</button>
    </div>
    <section className="deck" tabIndex={0} aria-label={copy.nav.play} {...swipe} data-slide={slide} data-mode-transition={modeTransition || undefined} style={{ "--feed-snap-duration": `${CARD_MOVE_MS}ms` } as CSSProperties}
      onKeyDown={e => { if (e.target !== e.currentTarget) return; if (typeMode && e.key === "ArrowRight") { e.preventDefault(); leaveTypeMode(); } else if (!typeMode && e.key === "ArrowLeft") { e.preventDefault(); enterTypeMode(); } else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); moveCard(e.key === "ArrowUp" ? 1 : -1); } }}>
      <FeedNeighbors pool={pool} cardId={card.id} stakeVoices={state.stakeVoices} />
      {modeTransition && <div className="feed-mode-neighbor" aria-hidden="true" inert>
        <GameCard card={card} active={false} flipped={false} slide="" stakeVoice={stakeVoice} liked={likedCards.has(card.id)} saved={saved} canRemoveSaved={Boolean(currentDeck?.cardIds.includes(card.id))} gestureGuide={showGestureGuide} swipeHint={typeMode ? copy.play.typeModeHint : typeModeAvailable ? copy.play.typeModeEntryHint : undefined} returnHint={typeMode ? copy.play.typeModeHint : undefined} onFlip={() => {}} paletteOverride={cardPalette ?? undefined} />
      </div>}
      <div className="feed-current"><GameCard card={card} flipped={flipped} slide={slide} stakeVoice={stakeVoice} liked={likedCards.has(card.id)} saved={saved} canRemoveSaved={Boolean(currentDeck?.cardIds.includes(card.id))} gestureGuide={showGestureGuide} swipeHint={typeMode ? copy.play.typeModeHint : typeModeAvailable ? copy.play.typeModeEntryHint : undefined} returnHint={typeMode ? copy.play.typeModeHint : undefined} onFlip={setFlipped} onLike={toggleLike} onSave={openCollection} onComment={commentCard} onShare={() => void shareCard()} onPalette={setCardPalette} /></div>
      {issueNudge && <div className="stake-issue-nudge" role="status" aria-live="polite"><span><Icon name="trophy" size={12} /><b>{copy.play.issueStakeNudge}</b></span><button type="button" onClick={() => openStakeRecord(issueNudge)}>{copy.play.issueStakeNudgeAction}<Icon name="arrow" size={11} /></button></div>}
    </section>
    <SceneDrawer open={panel === "scene"} onClose={close} onCreate={() => setPanel("new")} onSceneChange={() => remember({ playMode: null })} />
    <AiSheet open={panel === "ai"} onClose={close} />
    <StakeRecordsSheet open={panel === "records"} onClose={close} onIssue={openStakeRecord} onDelete={handleStakeDelete} />
    <CollectionSheet open={panel === "save"} onClose={close} cardId={card.id} onCreate={() => setPanel("new-and-save")} />
    <CreateDeckSheet open={panel === "new" || panel === "new-and-save"} onClose={close} cardId={panel === "new-and-save" ? card.id : undefined} />
    <IssueStakeSheet open={panel === "issue"} onClose={close} cardTitle={card.label} stake={stake ?? copy.play.defaultStake} issuerName={state.profileName} issuance={issuance} voice={stakeVoice} onIssue={signStake} onShare={() => void shareStake()} onSelfClaim={selfClaimStake} canSelfClaim={!issuance?.claimToken} />
    <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={continuePendingStake} />
  </>;
}
