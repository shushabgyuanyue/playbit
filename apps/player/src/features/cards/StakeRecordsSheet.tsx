import { useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { cards } from "../../data/demo";
import type { PlayerState, StakeRecord } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Sheet } from "../../components/ui/Sheet";
import { usePlayer } from "../player/PlayerProvider";

export const STAKE_RECORD_TTL_MS = 24 * 60 * 60 * 1000;

export function getPendingStakeRecords(state: PlayerState, now = Date.now()) {
  return Object.values(state.stakeRecords ?? {}).filter(record => {
    const createdAt = Date.parse(record.createdAt);
    return state.stakes[record.cardId] === record.title
      && !state.issuedStakes[record.cardId]
      && Number.isFinite(createdAt)
      && now - createdAt < STAKE_RECORD_TTL_MS;
  });
}

function remainingHours(record: StakeRecord, now = Date.now()) {
  return Math.max(1, Math.ceil((STAKE_RECORD_TTL_MS - (now - Date.parse(record.createdAt))) / (60 * 60 * 1000)));
}

export function StakeRecordsSheet({ open, onClose, onIssue }: { open: boolean; onClose: () => void; onIssue: (record: StakeRecord) => void }) {
  const { state, update, notify } = usePlayer();
  const [deletingRecord, setDeletingRecord] = useState<StakeRecord | null>(null);
  const records = getPendingStakeRecords(state);
  function deleteRecord() {
    if (!deletingRecord) return;
    update(current => {
      const stakes = { ...current.stakes };
      const stakeVoices = { ...current.stakeVoices };
      const stakeRecords = { ...(current.stakeRecords ?? {}) };
      delete stakes[deletingRecord.cardId];
      delete stakeVoices[deletingRecord.cardId];
      delete stakeRecords[deletingRecord.cardId];
      return { ...current, stakes, stakeVoices, stakeRecords };
    });
    setDeletingRecord(null);
    notify(copy.play.stakeRecordDeleted);
  }
  return <Sheet open={open} onClose={onClose} title={copy.play.stakeRecords} eyebrow={copy.play.stakeRecordsEyebrow} description={copy.play.stakeRecordsHint}>
    {records.length ? <div className="stake-record-list">
      {records.map(record => {
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
    </div> : <div className="stake-record-empty"><span><Icon name="trophy" size={20} /></span><b>{copy.play.stakeRecordsEmpty}</b><small>在卡片上添个彩头，跳过签发后会留在这里。</small></div>}
    <ConfirmDialog open={Boolean(deletingRecord)} onClose={() => setDeletingRecord(null)} title={copy.play.stakeRecordDeleteTitle} description={copy.play.stakeRecordDeleteHint} confirmLabel={copy.play.stakeRecordDeleteConfirm} onConfirm={deleteRecord} />
  </Sheet>;
}
