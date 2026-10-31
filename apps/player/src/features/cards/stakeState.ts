import type { PlayerState, VoiceNote } from "../../data/types";

export function saveStakeVoice(state: PlayerState, cardId: string, voice: VoiceNote, fallbackTitle: string, createdAt = new Date().toISOString()): PlayerState {
  const title = state.stakes[cardId] ?? fallbackTitle;
  const previous = state.stakeRecords[cardId];
  return {
    ...state,
    stakes: { ...state.stakes, [cardId]: title },
    stakeVoices: { ...state.stakeVoices, [cardId]: voice },
    stakeRecords: {
      ...state.stakeRecords,
      [cardId]: {
        cardId,
        title,
        createdAt: previous?.createdAt ?? createdAt,
        locked: previous?.locked === true
      }
    }
  };
}
