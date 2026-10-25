import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { scenes } from "../data/demo";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { AiSheet, CollectionSheet, CreateDeckSheet, SceneDrawer } from "../features/cards/DeckSheets";
import { GameCard } from "../features/cards/GameCard";
import { IssueStakeSheet } from "../features/cards/IssueStakeSheet";
import { AuthSheet } from "../features/player/AuthSheet";
import { useCardDeck } from "../features/cards/useCardDeck";
import { usePlayer } from "../features/player/PlayerProvider";
import { claimGameStake, issueGameStake } from "../features/player/transitions";
import type { Signature } from "../data/types";
import { usePageMemory } from "../services/pageMemory";
import { isPlayerApiConfigured, PlayerApiError, playerApi, signatureToDataUrl } from "../services/playerApi";

type Panel = "scene" | "ai" | "save" | "stake" | "issue" | "new" | "new-and-save" | null;

export function PlayPage() {
  const { state, update, notify, auth } = usePlayer();
  const { memory, remember } = usePageMemory();
  const { card, pool, flipped, setFlipped, slide, go } = useCardDeck(memory.playFlippedCardId);
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const [stakeInput, setStakeInput] = useState("");
  const [pendingSaveCardId, setPendingSaveCardId] = useState<string | null>(null);
  const [issueNudge, setIssueNudge] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<Signature | null>(null);
  const pendingMove = useRef<number | null>(null);
  const ignoredIssueNudges = useRef(new Set<string>());
  const touch = useRef<{ x: number; y: number } | null>(null);
  const scene = state.decks.find(d => d.id === state.deckId)?.name ?? scenes.find(s => s.id === state.sceneId)?.title ?? scenes[0]!.title;
  const stake = state.stakes[card.id];
  const issuance = state.issuedStakes[card.id] ?? null;
  const alreadySaved = state.decks.some(deck => deck.cardIds.includes(card.id));
  const saved = alreadySaved || pendingSaveCardId === card.id;
  const close = () => {
    if (panel === "save" && !alreadySaved) setPendingSaveCardId(null);
    setPanel(null);
  };
  useEffect(() => {
    if (alreadySaved && pendingSaveCardId === card.id) setPendingSaveCardId(null);
  }, [alreadySaved, card.id, pendingSaveCardId]);
  useEffect(() => {
    if (!issueNudge) return;
    const timer = window.setTimeout(() => {
      setIssueNudge(false);
      pendingMove.current = null;
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [issueNudge]);
  useEffect(() => {
    remember({ playFlippedCardId: flipped ? card.id : null });
  }, [card.id, flipped, remember]);
  function openCollection() {
    if (!alreadySaved) setPendingSaveCardId(card.id);
    setPanel("save");
  }
  function openStake() {
    setIssueNudge(false);
    pendingMove.current = null;
    if (issuance) { setPanel("issue"); return; }
    setStakeInput(stake ?? copy.play.defaultStake); setPanel("stake");
  }
  function openIssue() {
    setIssueNudge(false);
    pendingMove.current = null;
    if (!stake) { setPanel("stake"); return; }
    setPanel("issue");
  }
  function saveStake(remove = false) {
    if (issuance) return;
    if (!remove && !stakeInput.trim()) return;
    update(current => { const next = { ...current.stakes }; if (remove) delete next[card.id]; else next[card.id] = stakeInput.trim(); return { ...current, stakes: next }; });
    close(); notify(remove ? copy.play.stakeRemoved : copy.play.stakeSaved);
  }
  function moveCard(direction: number) {
    if (stake && !issuance && !ignoredIssueNudges.current.has(card.id)) {
      pendingMove.current = direction;
      setIssueNudge(true);
      return;
    }
    go(direction);
  }
  function ignoreIssueNudge() {
    ignoredIssueNudges.current.add(card.id);
    setIssueNudge(false);
    const direction = pendingMove.current ?? 1;
    pendingMove.current = null;
    go(direction);
  }
  async function persistGameStake(signature: Signature, authReady = false) {
    if (!stake || issuance || (!auth.user && !authReady)) return;
    if (isPlayerApiConfigured()) {
      try {
        const result = await playerApi.createIndependentCoupon({
          name: stake,
          description: `来自「${card.label}」的游戏彩头`,
          sourceLabel: copy.wallet.issueSourceOptions.game,
          gameResultId: null,
          signatureDataUrl: signatureToDataUrl(signature),
          claimLimit: 1
        });
        const remoteIssuance = result.coupon;
        update(current => ({
          ...current,
          issuedStakes: {
            ...current.issuedStakes,
            [card.id]: {
              id: remoteIssuance.id,
              remoteId: remoteIssuance.id,
              claimToken: remoteIssuance.claimToken ?? undefined,
              cardId: card.id,
              cardTitle: card.label,
              title: remoteIssuance.name,
              issuerName: remoteIssuance.issuerNickname,
              signature,
              issuedAt: remoteIssuance.createdAt,
              source: "game",
              status: "pending_claim"
            }
          }
        }));
        setPanel("issue");
        notify(copy.play.issueStakeSigned);
        return;
      } catch (error) {
        notify(error instanceof PlayerApiError && error.status === 0 ? copy.auth.network : copy.play.issueStake);
        return;
      }
    }
    update(current => issueGameStake(current, card.id, card.label, stake, current.profileName, signature));
    setPanel("issue");
    notify(copy.play.issueStakeSigned);
  }

  function signStake(signature: Signature) {
    if (!stake || issuance) return;
    if (isPlayerApiConfigured() && !auth.user) {
      setPendingSignature(signature);
      setAuthOpen(true);
      return;
    }
    void persistGameStake(signature);
  }
  async function shareStake() {
    if (!issuance) return;
    const url = issuance.claimToken
      ? `${window.location.origin}/claim/${encodeURIComponent(issuance.claimToken)}`
      : `${window.location.href.split("#")[0]}#stake=${issuance.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: issuance.title, text: `${issuance.cardTitle} · ${issuance.title}`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      notify(copy.play.issueStakeShared);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) notify(copy.play.issueStakeShared);
    }
  }
  function selfClaimStake() {
    if (!issuance) return;
    update(current => claimGameStake(current, issuance.id, current.profileName));
    setPanel(null);
    navigate("/benefits");
    notify(copy.play.issueStakeClaimed);
  }
  return <>
    <div className="game-menu"><div className="game-menu-scroll">
      <button onClick={() => setPanel("scene")}><span><Icon name="grid" size={19} /></span><b>{copy.play.scene}</b><small>{scene}</small></button>
      <button className="game-ai" onClick={() => setPanel("ai")}><span><Icon name="spark" size={18} /></span><b>{copy.play.ai}</b></button>
    </div></div>
    <section className="deck" tabIndex={0} aria-label={copy.nav.play}
      onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); moveCard(e.key === "ArrowUp" ? 1 : -1); } }}
      onTouchStart={e => { touch.current = (e.target as HTMLElement).closest("button") ? null : { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={e => { if (!touch.current) return; const dx = touch.current.x - e.changedTouches[0]!.clientX; const dy = touch.current.y - e.changedTouches[0]!.clientY; touch.current = null; if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)) moveCard(dy > 0 ? 1 : -1); }}>
      <div className="stack-card stack-one" aria-hidden="true" /><div className="stack-card stack-two" aria-hidden="true" />
      <GameCard card={card} scene={scene} flipped={flipped} slide={slide} saved={saved} stake={stake} stakeIssued={Boolean(issuance)} onFlip={setFlipped} onSave={openCollection} onStake={openStake} onIssue={openIssue} />
      {issueNudge && <div className="stake-issue-nudge" role="status"><span><Icon name="sign" size={15} /><b>{copy.play.issueStakeNudge}</b></span><div><button type="button" onClick={openIssue}>{copy.play.issueStakeNudgeAction}</button><button type="button" onClick={ignoreIssueNudge}>{copy.play.issueStakeNudgeIgnore}</button></div></div>}
      {pool.length > 1 && <div className="deck-controls"><button onClick={() => moveCard(-1)} aria-label={copy.play.previous}>↓</button><button onClick={() => moveCard(1)} aria-label={copy.play.next}>↑</button></div>}
    </section>
    <SceneDrawer open={panel === "scene"} onClose={close} onCreate={() => setPanel("new")} />
    <AiSheet open={panel === "ai"} onClose={close} />
    <CollectionSheet open={panel === "save"} onClose={close} cardId={card.id} onCreate={() => setPanel("new-and-save")} />
    <CreateDeckSheet open={panel === "new" || panel === "new-and-save"} onClose={close} cardId={panel === "new-and-save" ? card.id : undefined} />
    <Sheet open={panel === "stake"} onClose={close} title={copy.play.stakeTitle} description={copy.play.stakeHint}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); saveStake(); }}><label>{copy.play.stake}<input value={stakeInput} onChange={e => setStakeInput(e.target.value)} placeholder={copy.play.stakePlaceholder} maxLength={80} required /></label><button className="primary-button" disabled={!stakeInput.trim()}>{copy.play.stakeConfirm}</button>{stake && <button type="button" className="text-button" onClick={() => saveStake(true)}>{copy.play.removeStake}</button>}</form>
    </Sheet>
    <IssueStakeSheet open={panel === "issue"} onClose={close} cardTitle={card.label} stake={stake ?? ""} issuerName={state.profileName} issuance={issuance} onIssue={signStake} onShare={() => void shareStake()} onSelfClaim={selfClaimStake} canSelfClaim={!issuance?.claimToken} />
    <AuthSheet open={authOpen} onClose={() => { setAuthOpen(false); setPendingSignature(null); }} onSuccess={() => { const signature = pendingSignature; setPendingSignature(null); if (signature) void persistGameStake(signature, true); }} />
  </>;
}
