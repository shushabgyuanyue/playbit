import { playerCopy as copy } from "@playbit/content/player";
import type { PromiseDraft, VoiceNote } from "../../data/types";

export function applyPromiseVoice(draft: PromiseDraft, voice: VoiceNote): PromiseDraft {
  return {
    ...draft,
    text: voice.assetId ? voice.transcript?.trim() || copy.promise.voice.challengeLabel : "",
    benefit: voice.assetId ? "按这段原声兑现" : "",
    voice,
    signatures: { a: [], b: [] }
  };
}
