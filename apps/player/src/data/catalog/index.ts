import type { Scene } from "../types";
import { everydayCards } from "./everyday";
import { merchantCards } from "./merchant";
import { mysteryCards } from "./mystery";
import { relationshipCards } from "./relationship";
import { socialCards } from "./social";
import { toGameCard } from "./types";

export const EXPLORE_SCENE_ID = "explore" as const;
export const cardDrafts = [...relationshipCards, ...everydayCards, ...socialCards, ...merchantCards, ...mysteryCards];
export const sceneCards = cardDrafts.map(toGameCard);
export const scenes: Scene[] = [
  { id: "date", title: "和TA❤", icon: "date" },
  { id: "wait", title: "等车5分钟", icon: "clock" },
  { id: "dishes", title: "洗碗局", icon: "utensils" },
  { id: "friends", title: "饭后别急走", icon: "friends" },
  { id: "hello", title: "刚认识，别尬聊", icon: "hello" },
  { id: "night", title: "睡前还想聊", icon: "moon" },
  { id: "family", title: "回家吃顿饭", icon: "home" },
  { id: "shop", title: "小店整点活", icon: "store" }
];
