import { dailyCards, drawCard } from "@playbit/cards";
import type { Hono } from "hono";

export function registerCardRoutes(app: Hono) {
  app.get("/cards", (context) => context.json({ cards: dailyCards }));

  app.post("/cards/draw", async (context) => {
    const body = await context.req.json().catch(() => ({ previousIds: [] }));
    const previousIds = Array.isArray(body.previousIds) ? body.previousIds : [];
    return context.json({ card: drawCard(previousIds, Boolean(body.includeMagic)) });
  });
}
