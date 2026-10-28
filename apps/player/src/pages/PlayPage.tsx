import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { useLinkSharing } from "../features/player/useLinkSharing";
import { benefitShareData } from "../services/linkSharing";
import { cards, scenes } from "../data/demo";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { AiSheet, CollectionSheet, CreateDeckSheet, SceneDrawer } from "../features/cards/DeckSheets";
import { GameCard } from "../features/cards/GameCard";
import { FeedNeighbors } from "../features/cards/FeedNeighbors";
import { IssueStakeSheet } from "../features/cards/IssueStakeSheet";
import { getPendingStakeRecords, StakeRecordsSheet, STAKE_RECORD_TTL_MS } from "../features/cards/StakeRecordsSheet";
import { CARD_MOVE_MS, useCardDeck } from "../features/cards/useCardDeck";
import { useFeedSwipe } from "../features/cards/useFeedSwipe";
import { usePlayer } from "../features/player/PlayerProvider";
import { claimGameStake, issueGameStake } from "../features/player/transitions";
import type { Signature, StakeRecord } from "../data/types";
import { usePageMemory } from "../services/pageMemory";
import { isPlayerApiConfigured, PlayerApiError, playerApi, signatureToDataUrl } from "../services/playerApi";

type Panel = "scene" | "ai" | "records" | "save" | "stake" | "issue" | "new" | "new-and-save" | null;

export function PlayPage() {
  const shareLink = useLinkSharing();
  const { state, update, notify } = usePlayer();
  const { memory, remember } = usePageMemory();
  const { card, pool, flipped, setFlipped, slide, go } = useCardDeck(memory.playFlippedCardId);
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const [stakeInput, setStakeInput] = useState("");
  const [pendingSaveCardId, setPendingSaveCardId] = useState<string | null>(null);
  const [issueNudge, setIssueNudge] = useState(false);
  const pendingMove = useRef<number | null>(null);
  const ignoredIssueNudges = useRef(new Set<string>());
  const [pendingIssueCardId, setPendingIssueCardId] = useState<string | null>(null);
  const scene = state.decks.find(d => d.id === state.deckId)?.name ?? scenes.find(s => s.id === state.sceneId)?.title ?? scenes[0]!.title;
  const stake = state.stakes[card.id];
  const issuance = state.issuedStakes[card.id] ?? null;
  const pendingStakeRecords = getPendingStakeRecords(state);
  const alreadySaved = state.decks.some(deck => deck.cardIds.includes(card.id));
  const saved = alreadySaved || pendingSaveCardId === card.id;
  const swipe = useFeedSwipe(slide, card.id, moveCard);
  const close = () => {
    if (panel === "save" && !alreadySaved) setPendingSaveCardId(null);
    setPanel(null);
  };
  useEffect(() => {
    if (alreadySaved && pendingSaveCardId === card.id) setPendingSaveCardId(null);
  }, [alreadySaved, card.id, pendingSaveCardId]);
  useEffect(() => {
    const now = Date.now();
    const records = Object.values(state.stakeRecords ?? {});
    const stale = records.filter(record => {
      const expired = now - Date.parse(record.createdAt) >= STAKE_RECORD_TTL_MS;
      return expired || Boolean(state.issuedStakes[record.cardId]) || state.stakes[record.cardId] !== record.title;
    });
    if (stale.length) {
      update(current => {
        const stakeRecords = { ...(current.stakeRecords ?? {}) };
        const stakes = { ...current.stakes };
        for (const record of stale) {
          delete stakeRecords[record.cardId];
          if (now - Date.parse(record.createdAt) >= STAKE_RECORD_TTL_MS && !current.issuedStakes[record.cardId]) delete stakes[record.cardId];
        }
        return { ...current, stakes, stakeRecords };
      });
    }
    const nextExpiry = records.map(record => Date.parse(record.createdAt) + STAKE_RECORD_TTL_MS).filter(value => Number.isFinite(value) && value > now).sort((a, b) => a - b)[0];
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
  function openStakeRecord(record: StakeRecord) {
    const target = cards.find(item => item.id === record.cardId);
    if (!target) return;
    const deck = state.decks.find(item => item.cardIds.includes(record.cardId));
    setPendingIssueCardId(record.cardId);
    update(current => ({ ...current, deckId: deck?.id ?? null, sceneId: deck ? current.sceneId : target.sceneIds[0] ?? current.sceneId, cardId: record.cardId }));
    setPanel(null);
  }
  function saveStake(remove = false) {
    if (issuance) return;
    if (!remove && !stakeInput.trim()) return;
    update(current => {
      const stakes = { ...current.stakes };
      const stakeRecords = { ...(current.stakeRecords ?? {}) };
      if (remove) {
        delete stakes[card.id];
        delete stakeRecords[card.id];
      } else {
        const title = stakeInput.trim();
        stakes[card.id] = title;
        if (stakeRecords[card.id]) stakeRecords[card.id] = { cardId: card.id, title, createdAt: new Date().toISOString() };
      }
      return { ...current, stakes, stakeRecords };
    });
    close(); notify(remove ? copy.play.stakeRemoved : copy.play.stakeSaved);
  }
  function moveCard(direction: number) {
    if (slide || pool.length < 2) return false;
    if (stake && !issuance && !ignoredIssueNudges.current.has(card.id)) {
      pendingMove.current = direction;
      setIssueNudge(true);
      return false;
    }
    go(direction);
    return true;
  }
  function ignoreIssueNudge() {
    ignoredIssueNudges.current.add(card.id);
    if (stake && !issuance) {
      update(current => ({ ...current, stakeRecords: { ...(current.stakeRecords ?? {}), [card.id]: { cardId: card.id, title: stake, createdAt: new Date().toISOString() } } }));
    }
    setIssueNudge(false);
    const direction = pendingMove.current ?? 1;
    pendingMove.current = null;
    go(direction);
  }
  async function persistGameStake(signature: Signature) {
    if (!stake || issuance) return;
    if (isPlayerApiConfigured()) {
      try {
        const result = await playerApi.createPublicCoupon({
          name: stake,
          description: `来自「${card.label}」的游戏彩头`,
          sourceLabel: copy.wallet.issueSourceOptions.game,
          gameResultId: null,
          signatureDataUrl: signatureToDataUrl(signature),
          claimLimit: 1
        });
        const remoteIssuance = result.coupon;
        update(current => {
          const stakeRecords = { ...(current.stakeRecords ?? {}) };
          delete stakeRecords[card.id];
          return {
            ...current,
            stakeRecords,
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
          };
        });
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
    void persistGameStake(signature);
  }
  async function shareStake() {
    await shareLink(benefitShareData(issuance, issuance?.cardTitle));
  }
  function selfClaimStake() {
    if (!issuance) return;
    update(current => claimGameStake(current, issuance.id, current.profileName));
    setPanel(null);
    navigate("/benefits", { replace: true });
    notify(copy.play.issueStakeClaimed);
  }
  return <>
    <div className="feed-toolbar">
      <button className="feed-scene" onClick={() => setPanel("scene")} aria-label={`${copy.play.scene}：${scene}`}><Icon name="grid" size={17} /><span>{scene}</span><Icon name="chevronDown" size={14} /></button>
      <button className="feed-tool" onClick={() => setPanel("ai")} aria-label={copy.play.ai} title={copy.play.ai}><Icon name="spark" size={20} /></button>
      <button className={`feed-tool ${saved ? "is-saved" : ""}`} onClick={openCollection} aria-label={copy.play.collect} aria-pressed={saved} title={copy.play.collect}><Icon name="bookmark" size={20} /></button>
      <button className="feed-tool feed-records" onClick={() => setPanel("records")} aria-label={copy.play.stakeRecords} title={copy.play.stakeRecords}><Icon name="trophy" size={19} />{pendingStakeRecords.length > 0 && <i>{pendingStakeRecords.length}</i>}</button>
    </div>
    <section className="deck" tabIndex={0} aria-label={copy.nav.play} {...swipe} data-slide={slide} style={{ "--feed-snap-duration": `${CARD_MOVE_MS}ms` } as CSSProperties}
      onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); moveCard(e.key === "ArrowUp" ? 1 : -1); } }}>
      <FeedNeighbors pool={pool} cardId={card.id} stakes={state.stakes} issuedStakes={state.issuedStakes} />
      <div className="feed-current"><GameCard key={card.id} card={card} flipped={flipped} slide={slide} stake={stake} stakeIssued={Boolean(issuance)} onFlip={setFlipped} onStake={openStake} onIssue={openIssue} /></div>
      {issueNudge && <div className="stake-issue-nudge" role="status"><span><Icon name="sign" size={15} /><b>{copy.play.issueStakeNudge}</b></span><div><button type="button" onClick={openIssue}>{copy.play.issueStakeNudgeAction}</button><button type="button" onClick={ignoreIssueNudge}>{copy.play.issueStakeNudgeIgnore}</button></div></div>}
      {pool.length > 1 && <div className="deck-controls"><button onClick={() => moveCard(-1)} aria-label={copy.play.previous} title={copy.play.previous}><Icon name="chevronDown" size={20} /></button><button onClick={() => moveCard(1)} aria-label={copy.play.next} title={copy.play.next}><Icon name="chevronUp" size={20} /></button></div>}
    </section>
    <SceneDrawer open={panel === "scene"} onClose={close} onCreate={() => setPanel("new")} />
    <AiSheet open={panel === "ai"} onClose={close} />
    <StakeRecordsSheet open={panel === "records"} onClose={close} onIssue={openStakeRecord} />
    <CollectionSheet open={panel === "save"} onClose={close} cardId={card.id} onCreate={() => setPanel("new-and-save")} />
    <CreateDeckSheet open={panel === "new" || panel === "new-and-save"} onClose={close} cardId={panel === "new-and-save" ? card.id : undefined} />
    <Sheet open={panel === "stake"} onClose={close} title={copy.play.stakeTitle} description={copy.play.stakeHint}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); saveStake(); }}><label>{copy.play.stake}<input value={stakeInput} onChange={e => setStakeInput(e.target.value)} placeholder={copy.play.stakePlaceholder} maxLength={80} required /></label><button className="primary-button" disabled={!stakeInput.trim()}>{copy.play.stakeConfirm}</button>{stake && <button type="button" className="text-button" onClick={() => saveStake(true)}>{copy.play.removeStake}</button>}</form>
    </Sheet>
    <IssueStakeSheet open={panel === "issue"} onClose={close} cardTitle={card.label} stake={stake ?? ""} issuerName={state.profileName} issuance={issuance} onIssue={signStake} onShare={() => void shareStake()} onSelfClaim={selfClaimStake} canSelfClaim={!issuance?.claimToken} />
  </>;
}
