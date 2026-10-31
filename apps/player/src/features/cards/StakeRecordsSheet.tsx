import { useEffect, useState, type UIEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { cards } from "../../data/demo";
import type { PlayerState, StakeRecord } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Sheet } from "../../components/ui/Sheet";
import { usePlayer } from "../player/PlayerProvider";
import { deleteVoiceAsset } from "../../services/voiceRepository";

export const STAKE_RECORD_TTL_MS = 24 * 60 * 60 * 1000;
const INITIAL_RECORD_LIMIT = 6;
const RECORD_PAGE_SIZE = 6;

export function getPendingStakeRecords(state: PlayerState, now = Date.now()) {
  return Object.values(state.stakeRecords ?? {}).filter(record => {
    const createdAt = Date.parse(record.createdAt);
    return state.stakes[record.cardId] === record.title
      && Boolean(state.stakeVoices[record.cardId]?.assetId)
      && !state.issuedStakes[record.cardId]
      && Number.isFinite(createdAt)
      && now - createdAt < STAKE_RECORD_TTL_MS;
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function remainingHours(record: StakeRecord, now = Date.now()) {
  return Math.max(1, Math.ceil((STAKE_RECORD_TTL_MS - (now - Date.parse(record.createdAt))) / (60 * 60 * 1000)));
}

export function StakeRecordsSheet({ open, onClose, onIssue, onDelete }: { open: boolean; onClose: () => void; onIssue: (record: StakeRecord) => void; onDelete?: (cardId: string) => void }) {
  const { state, update, notify } = usePlayer();
  const [deletingRecord, setDeletingRecord] = useState<StakeRecord | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RECORD_LIMIT);
  const records = getPendingStakeRecords(state);
  const visibleRecords = records.slice(0, visibleCount);
  const hasMore = visibleRecords.length < records.length;

  useEffect(() => {
    if (!open) setVisibleCount(INITIAL_RECORD_LIMIT);
  }, [open]);

  function handleRecordScroll(event: UIEvent<HTMLDivElement>) {
    if (!hasMore) return;
    const element = event.currentTarget;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 48) {
      setVisibleCount(current => Math.min(records.length, current + RECORD_PAGE_SIZE));
    }
  }

  function deleteRecord() {
    if (!deletingRecord) return;
    const assetId = state.stakeVoices[deletingRecord.cardId]?.assetId;
    onDelete?.(deletingRecord.cardId);
    update(current => {
      const stakes = { ...current.stakes };
      const stakeVoices = { ...current.stakeVoices };
      const stakeRecords = { ...(current.stakeRecords ?? {}) };
      delete stakes[deletingRecord.cardId];
      delete stakeVoices[deletingRecord.cardId];
      delete stakeRecords[deletingRecord.cardId];
      return { ...current, stakes, stakeVoices, stakeRecords };
    });
    if (assetId) void deleteVoiceAsset(assetId).catch(() => undefined);
    setDeletingRecord(null);
    notify(copy.play.stakeRecordDeleted);
  }

  function clearRecords() {
    const cardIds = Array.from(new Set([
      ...records.map(record => record.cardId),
      ...Object.keys(state.stakes),
      ...Object.keys(state.stakeVoices)
    ])).filter(cardId => !state.issuedStakes[cardId]);
    if (!cardIds.length) return;
    const assetIds = cardIds.map(cardId => state.stakeVoices[cardId]?.assetId).filter((assetId): assetId is string => Boolean(assetId));
    cardIds.forEach(cardId => onDelete?.(cardId));
    update(current => {
      const stakes = { ...current.stakes };
      const stakeVoices = { ...current.stakeVoices };
      const stakeRecords = { ...(current.stakeRecords ?? {}) };
      for (const cardId of cardIds) {
        delete stakes[cardId];
        delete stakeVoices[cardId];
        delete stakeRecords[cardId];
      }
      return { ...current, stakes, stakeVoices, stakeRecords };
    });
    void Promise.all(assetIds.map(assetId => deleteVoiceAsset(assetId).catch(() => undefined)));
    setClearOpen(false);
    setVisibleCount(INITIAL_RECORD_LIMIT);
    notify(copy.play.stakeRecordsCleared);
  }

  return <Sheet className="stake-record-sheet" open={open} onClose={onClose} title={copy.play.stakeRecords} eyebrow={copy.play.stakeRecordsEyebrow} description={copy.play.stakeRecordsHint}>
    {records.length ? <>
      <div className="stake-record-toolbar">
        <span>{records.length} 条待交出</span>
        <button className="stake-record-clear" type="button" onClick={() => setClearOpen(true)}><Icon name="trash" size={13} />{copy.play.stakeRecordsClear}</button>
      </div>
      <div className="stake-record-list" onScroll={handleRecordScroll}>
      {visibleRecords.map(record => {
        const card = cards.find(item => item.id === record.cardId);
        return <div className="stake-record-item" key={record.cardId}>
          <button className="stake-record-main" type="button" onClick={() => onIssue(record)}>
            <span className={`stake-record-mark ${card?.color ?? "coral"}`}><Icon name="trophy" size={17} /></span>
            <span className="stake-record-copy"><b>{record.title}</b><small>{card?.label ?? "游戏彩头"} · {copy.play.stakeRecordExpires(remainingHours(record))}</small></span>
            <span className="stake-record-action">{copy.play.stakeRecordIssue}<Icon name="arrow" size={14} /></span>
          </button>
          <button className="stake-record-delete" type="button" aria-label={copy.play.stakeRecordDelete} title={copy.play.stakeRecordDelete} onClick={() => setDeletingRecord(record)}><Icon name="trash" size={14} /></button>
        </div>;
      })}
      {hasMore && <div className="stake-record-load-more">{copy.play.stakeRecordsLoadMore(records.length - visibleRecords.length)}</div>}
      {!hasMore && records.length > INITIAL_RECORD_LIMIT && <div className="stake-record-load-more">{copy.play.stakeRecordsAllLoaded}</div>}
      </div>
    </> : <div className="stake-record-empty"><span><Icon name="trophy" size={20} /></span><b>{copy.play.stakeRecordsEmpty}</b><small>{copy.play.stakeRecordsEmptyHint}</small></div>}
    <ConfirmDialog open={clearOpen} onClose={() => setClearOpen(false)} title={copy.play.stakeRecordsClearTitle} description={copy.play.stakeRecordsClearHint} confirmLabel={copy.play.stakeRecordsClearConfirm} onConfirm={clearRecords} />
    <ConfirmDialog open={Boolean(deletingRecord)} onClose={() => setDeletingRecord(null)} title={copy.play.stakeRecordDeleteTitle} description={copy.play.stakeRecordDeleteHint} confirmLabel={copy.play.stakeRecordDeleteConfirm} onConfirm={deleteRecord} />
  </Sheet>;
}
