import type { CardMedia, CardSponsor, CardTone, GameCard } from "../types";
import type { GameplayId } from "./gameplays";

export interface CardDraft {
  id: string;
  l1: GameplayId;
  title: string;
  scenes: string[];
  tone: CardTone;
  intro: string;
  headline: string;
  hook: string;
  goal: string;
  steps: [string, string, string];
  players: [number, number];
  seconds: number;
  adaptation: string;
  textStyle?: "quote";
  media?: CardMedia;
  note?: string;
  reveal?: GameCard["reveal"];
  sponsor?: CardSponsor;
}

export function toGameCard(draft: CardDraft): GameCard {
  return {
    id: draft.id, label: draft.title, sceneIds: draft.scenes, color: draft.tone,
    prompt: draft.intro, kicker: draft.headline, payoff: draft.hook,
    rule: draft.goal, steps: draft.steps, action: draft.steps[0],
    time: `${Math.ceil(draft.seconds / 60)} MIN`, moment: "",
    textStyle: draft.textStyle, media: draft.media, note: draft.note,
    reveal: draft.reveal, sponsor: draft.sponsor
  };
}
