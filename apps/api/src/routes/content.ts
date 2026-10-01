import { gameEventSchema, l2ContentTypeSchema, l2ReusePolicySchema, outcomeModelSchema, type ContentLifecycle, type ContentResearch, type ContentReviewDecision, type GameEvent } from "@playbit/shared";
import type { Context, Hono } from "hono";
import type { ContentRepository, ImportContentRow } from "../contentRepository.js";

function parseList(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function csvCell(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function listValue(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[|,;\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function nullableInteger(value: unknown, fallback: number | null = null) {
  if (value === null || value === undefined || value === "") return fallback;
  return typeof value === "number" && Number.isInteger(value) ? value : Number.isInteger(Number(value)) ? Number(value) : Number.NaN;
}

function firstValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== "") return record[key];
  }
  return undefined;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "是"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "否"].includes(normalized)) return false;
  return undefined;
}

function parsePlayerRange(value: unknown) {
  const parts = String(value ?? "").match(/\d+/g)?.map(Number) ?? [];
  return { min: parts[0], max: parts[1] ?? parts[0] };
}

function parseResearch(record: Record<string, unknown>): ContentResearch | undefined {
  const existing = isRecord(record.research) ? record.research : {};
  const text = (...keys: string[]) => textValue(firstValue(record, ...keys) ?? firstValue(existing, ...keys));
  const list = (...keys: string[]) => listValue(firstValue(record, ...keys) ?? firstValue(existing, ...keys));
  const research: ContentResearch = {
    sampleCode: text("sampleCode", "sample_code", "sampleId", "sample_id"),
    sourceType: text("sourceType", "source_type"),
    sourceRegion: text("sourceRegion", "source_region", "region"),
    sourceWork: text("sourceWork", "source_work", "workName", "work_name"),
    sourceUrl: text("sourceUrl", "source_url"),
    sourceEvidence: text("sourceEvidence", "source_evidence", "evidenceLevel", "evidence_level"),
    sourceOriginalRule: text("sourceOriginalRule", "source_original_rule", "originalRule", "original_rule"),
    coreInteraction: text("coreInteraction", "core_interaction"),
    informationStructure: list("informationStructure", "information_structure"),
    controlStructure: list("controlStructure", "control_structure"),
    propsRequirement: text("propsRequirement", "props_requirement", "props"),
    movementLevel: text("movementLevel", "movement_level"),
    l2Mode: text("l2Mode", "l2_mode"),
    l2Source: text("l2Source", "l2_source"),
    externalAiRequired: booleanValue(firstValue(record, "externalAiRequired", "external_ai_required") ?? firstValue(existing, "externalAiRequired", "external_ai_required")),
    externalAiRole: text("externalAiRole", "external_ai_role"),
    variantFamily: text("variantFamily", "variant_family"),
    editorialPriority: text("editorialPriority", "editorial_priority", "priority"),
    editorialNote: text("editorialNote", "editorial_note", "editorialComment", "editorial_comment")
  };
  const hasValue = Object.entries(research).some(([key, value]) => key === "externalAiRequired" ? value !== undefined : Array.isArray(value) ? value.length > 0 : Boolean(value));
  return hasValue ? research : undefined;
}

function normalizeReferences(values: string[], definitions: Array<{ id: string; code: string; name: string }>) {
  return values.map((value) => definitions.find((definition) => [definition.id, definition.code, definition.name].some((item) => item.toLowerCase() === value.toLowerCase()))?.id ?? value);
}

function objectValue(value: unknown) {
  if (isRecord(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function nonNegativeInteger(value: unknown, fallback: number) {
  const parsed = nullableInteger(value);
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function registerContentRoutes(app: Hono, content: ContentRepository) {
  app.get("/content/cards/next", (context) => {
    const actorKey = context.req.query("actorKey")?.trim();
    if (!actorKey) return context.json({ message: "actorKey is required" }, 422);
    const participantCount = Number(context.req.query("participantCount"));
    const preferredL1Id = context.req.query("l1Id")?.trim() || undefined;
    const card = content.next({
      actorKey,
      previousCardIds: parseList(context.req.query("previousIds")),
      participantCount: Number.isFinite(participantCount) && participantCount > 0 ? participantCount : undefined,
      preferredL1Id
    });
    if (!card) return context.json({ code: "NO_CONTENT", message: "No playable card is available" }, 404);
    return context.json({ card });
  });

  app.get("/content/cards/featured", (context) => {
    const limit = Number(context.req.query("limit"));
    return context.json({ cards: content.featured(Number.isFinite(limit) && limit > 0 ? limit : 3) });
  });

  async function ingestEvents(context: Context, expectedSessionId?: string) {
    const body = await context.req.json().catch(() => ({})) as { events?: unknown };
    if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 50) {
      return context.json({ message: "events must contain 1 to 50 items" }, 422);
    }
    const events: GameEvent[] = [];
    for (const item of body.events) {
      const parsed = gameEventSchema.safeParse(item);
      if (!parsed.success) return context.json({ message: "Invalid game event" }, 422);
      if (expectedSessionId && parsed.data.sessionId !== expectedSessionId) {
        return context.json({ message: "Event sessionId does not match route" }, 422);
      }
      events.push(parsed.data);
    }
    return context.json({ accepted: content.ingestEvents(events) });
  }

  app.post("/content/events", (context) => ingestEvents(context));
  app.post("/content/play-sessions/:id/events", (context) => ingestEvents(context, context.req.param("id")));

  app.post("/content/play-sessions/:id/complete", async (context) => {
    const body = await context.req.json().catch(() => ({})) as {
      actorKey?: string;
      cardId?: string;
      payload?: Record<string, unknown>;
    };
    if (!body.actorKey || !body.cardId) return context.json({ message: "actorKey and cardId are required" }, 422);
    const accepted = content.completeSession({
      sessionId: context.req.param("id"),
      actorKey: body.actorKey,
      cardId: body.cardId,
      payload: body.payload
    });
    if (accepted === null) return context.json({ message: "Play session not found" }, 404);
    return context.json({ accepted });
  });

  app.post("/content/preferences", async (context) => {
    const body = await context.req.json().catch(() => ({})) as { actorKey?: string; l1Id?: string; isFavorite?: boolean };
    if (!body.actorKey || !body.l1Id || typeof body.isFavorite !== "boolean") return context.json({ message: "actorKey, l1Id and isFavorite are required" }, 422);
    if (!content.setFavorite(body.actorKey, body.l1Id, body.isFavorite)) return context.json({ message: "L1 not found" }, 404);
    return context.json({ ok: true });
  });

  app.post("/content/play-sessions", async (context) => {
    const body = await context.req.json().catch(() => ({})) as { actorKey?: string; cardId?: string };
    if (!body.actorKey || !body.cardId) return context.json({ message: "actorKey and cardId are required" }, 422);
    const card = content.startSession({ actorKey: body.actorKey, cardId: body.cardId });
    if (!card) return context.json({ code: "CARD_NOT_FOUND", message: "Playable card is not available" }, 404);
    return context.json({ sessionId: card.sessionId, card });
  });

  app.get("/studio/content", (context) => {
    const statusParam = context.req.query("status");
    const page = Math.max(1, Number(context.req.query("page") ?? 1) || 1);
    const pageSize = Math.min(10, Math.max(1, Number(context.req.query("pageSize") ?? 10) || 10));
    const filtered = content.listContent({
      status: statusParam && statusParam !== "all" ? statusParam as ContentLifecycle : undefined,
      search: context.req.query("search"),
      scene: context.req.query("scene"),
      tool: context.req.query("tool")
    });
    const start = (page - 1) * pageSize;
    return context.json({ items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize });
  });

  app.get("/studio/content/export", (context) => {
    const statusParam = context.req.query("status");
    const items = content.listContent({
      status: statusParam && statusParam !== "all" ? statusParam as ContentLifecycle : undefined,
      search: context.req.query("search"),
      scene: context.req.query("scene"),
      tool: context.req.query("tool")
    });
    const header = ["code", "name", "title", "status", "version", "l0Ids", "scenes", "tags", "minPlayers", "maxPlayers", "durationMin", "durationMax", "outcomeModel", "toolIds", "contentType", "hook", "rule", "completionCondition", "failureCondition", "changeNote", "payloadJson", "sampleCode", "sourceType", "sourceRegion", "sourceWork", "sourceUrl", "sourceEvidence", "sourceOriginalRule", "coreInteraction", "informationStructure", "controlStructure", "propsRequirement", "movementLevel", "l2Mode", "l2Source", "externalAiRequired", "externalAiRole", "variantFamily", "editorialPriority", "editorialNote"];
    const lines = items.map(({ l1, version, l2 }) => [
      l1.code, l1.name, l2.title, l2.status, version.versionNo, l1.l0Ids.join("|"), l1.scenes.join("|"), l1.tags.join("|"), l1.minPlayers, l1.maxPlayers ?? "", l1.durationMin ?? "", l1.durationMax ?? "", l1.outcomeModel, version.toolIds.join("|"), l2.contentType, version.displayHook, version.shortRule, version.completionCondition, version.failureCondition ?? "", version.changeNote ?? "", JSON.stringify(l2.payload)
      , l1.research?.sampleCode ?? "", l1.research?.sourceType ?? "", l1.research?.sourceRegion ?? "", l1.research?.sourceWork ?? "", l1.research?.sourceUrl ?? "", l1.research?.sourceEvidence ?? "", l1.research?.sourceOriginalRule ?? "", l1.research?.coreInteraction ?? "", l1.research?.informationStructure?.join("|") ?? "", l1.research?.controlStructure?.join("|") ?? "", l1.research?.propsRequirement ?? "", l1.research?.movementLevel ?? "", l1.research?.l2Mode ?? "", l1.research?.l2Source ?? "", l1.research?.externalAiRequired ?? "", l1.research?.externalAiRole ?? "", l1.research?.variantFamily ?? "", l1.research?.editorialPriority ?? "", l1.research?.editorialNote ?? ""
    ].map(csvCell).join(","));
    return context.text(`\uFEFF${[header.map(csvCell).join(","), ...lines].join("\n")}`, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=playbit-content-export.csv"
    });
  });

  app.get("/studio/l1", (context) => {
    const statusParam = context.req.query("status");
    const items = content.listL1({
      status: statusParam && statusParam !== "all" ? statusParam as ContentLifecycle : undefined,
      search: context.req.query("search"),
      withoutL2: context.req.query("withoutL2") === "true"
    });
    return context.json({ items, total: items.length });
  });

  app.post("/studio/import", async (context) => {
    const body = await context.req.json().catch(() => ({})) as { rows?: unknown };
    if (!Array.isArray(body.rows) || body.rows.length > 500) return context.json({ message: "rows must contain 1 to 500 items" }, 422);
    const errors: Array<{ index: number; message: string }> = [];
    let createdL1 = 0;
    let createdCards = 0;
    const overview = content.overview();
    const l0Definitions = overview.l0s;
    for (const [index, raw] of body.rows.entries()) {
      if (!isRecord(raw)) {
        errors.push({ index, message: "每行必须是对象" });
        continue;
      }
      const row = raw as Partial<ImportContentRow> & Record<string, unknown>;
      const playerRange = parsePlayerRange(firstValue(row, "playerCount", "player_count"));
      const code = textValue(firstValue(row, "code", "l1Code", "l1_code", "sampleId", "sample_id"));
      const name = textValue(firstValue(row, "name", "l1Name", "l1_name", "sampleName", "sample_name"));
      const minPlayers = nullableInteger(firstValue(row, "minPlayers", "min_players"), playerRange.min ?? 2);
      const maxPlayers = nullableInteger(firstValue(row, "maxPlayers", "max_players"), playerRange.max ?? null);
      const durationMin = nullableInteger(firstValue(row, "durationMin", "duration_min"));
      const durationMax = nullableInteger(firstValue(row, "durationMax", "duration_max"));
      const outcomeModel = outcomeModelSchema.safeParse(firstValue(row, "outcomeModel", "outcome_model") ?? "shared_completion");
      const contentType = l2ContentTypeSchema.safeParse(firstValue(row, "contentType", "content_type") ?? "prompt");
      const sourceModeValue = String(firstValue(row, "sourceMode", "source_mode", "l2Source", "l2_source") ?? "hybrid").toLowerCase();
      const sourceMode = ["system", "human", "environment", "external_ai", "hybrid"].includes(sourceModeValue) ? sourceModeValue as "system" | "human" | "environment" | "external_ai" | "hybrid" : "hybrid";
      const l0Ids = normalizeReferences(listValue(firstValue(row, "l0Ids", "l0_ids", "l0Codes", "l0_codes", "l0Primary", "l0_primary")), l0Definitions);
      const scenes = listValue(firstValue(row, "scenes", "sceneTags", "scene_tags"));
      const tags = listValue(firstValue(row, "tags"));
      // Runtime cards use stable tool codes (timer/counter/scoreboard); keep
      // those codes in the version even though the admin catalog also has IDs.
      const toolIds = listValue(firstValue(row, "toolIds", "tool_ids"));
      const rawPayload = firstValue(row, "payload", "payloadJson", "payload_json");
      const payload = rawPayload === undefined ? {} : objectValue(rawPayload);
      const minPlayersNumber = typeof minPlayers === "number" ? minPlayers : null;
      const maxPlayersNumber = typeof maxPlayers === "number" ? maxPlayers : null;
      const durationMinNumber = typeof durationMin === "number" ? durationMin : null;
      const durationMaxNumber = typeof durationMax === "number" ? durationMax : null;
      const validMinPlayers = minPlayersNumber !== null && Number.isInteger(minPlayersNumber) && minPlayersNumber >= 1;
      const validMaxPlayers = maxPlayers === null || (maxPlayersNumber !== null && minPlayersNumber !== null && Number.isInteger(maxPlayersNumber) && maxPlayersNumber >= minPlayersNumber);
      const validDuration = (durationMin === null || (durationMinNumber !== null && Number.isInteger(durationMinNumber) && durationMinNumber >= 1)) && (durationMax === null || (durationMaxNumber !== null && Number.isInteger(durationMaxNumber) && durationMaxNumber >= 1)) && (durationMin === null || durationMax === null || (durationMinNumber !== null && durationMaxNumber !== null && durationMaxNumber >= durationMinNumber));
      if (!code || !name || !validMinPlayers || !validMaxPlayers || !validDuration || !outcomeModel.success || !contentType.success || !payload) {
        errors.push({ index, message: "code、name、人数范围、时长和枚举字段不合法" });
        continue;
      }
      const normalizedMinPlayers = minPlayersNumber as number;
      const l1 = content.createL1({
        code,
        name,
        l0Ids,
        minPlayers: normalizedMinPlayers,
        maxPlayers,
        durationMin,
        durationMax,
        outcomeModel: outcomeModel.data,
        scenes,
        tags,
        research: parseResearch(row)
      });
      if (!l1) {
        errors.push({ index, message: "code or name already exists" });
        continue;
      }
      createdL1 += 1;
      const shortRule = textValue(firstValue(row, "rule", "shortRule", "short_rule", "originalRule", "original_rule"));
      const completionCondition = textValue(firstValue(row, "completionCondition", "completion_condition"));
      const failureCondition = textValue(firstValue(row, "failureCondition", "failure_condition"));
      const displayHook = textValue(firstValue(row, "hook", "displayHook", "display_hook"));
      const changeNote = textValue(firstValue(row, "changeNote", "change_note"));
      const hasVersionFields = Boolean(shortRule || completionCondition || failureCondition || displayHook || toolIds.length || changeNote);
      if (hasVersionFields) {
        const version = content.createVersion(l1.id, {
          shortRule: shortRule || undefined,
          completionCondition: completionCondition || undefined,
          failureCondition: failureCondition || null,
          displayHook: displayHook || undefined,
          toolIds,
          changeNote: changeNote || null
        });
        if (!version) {
          errors.push({ index, message: "玩法版本创建失败" });
          continue;
        }
      }
      const title = textValue(firstValue(row, "title", "l2Title", "l2_title"));
      if (title) {
        const l2 = content.createL2({
          l1Id: l1.id,
          title,
          contentType: contentType.data,
          payload: {
            ...payload,
            ...(typeof payload.content === "string" || !shortRule ? {} : { content: shortRule })
          },
          toolIds,
          sourceMode,
          reusePolicy: {
            cooldownRounds: nonNegativeInteger(firstValue(row, "cooldownRounds", "cooldown_rounds"), 0),
            cooldownDays: nonNegativeInteger(firstValue(row, "cooldownDays", "cooldown_days"), 0),
            permanentExhaustion: booleanValue(firstValue(row, "permanentExhaustion", "permanent_exhaustion")) ?? false,
            skipCooldownRounds: nonNegativeInteger(firstValue(row, "skipCooldownRounds", "skip_cooldown_rounds"), 1)
          }
        });
        if (l2) createdCards += 1;
        else errors.push({ index, message: "用户卡创建失败" });
      }
    }
    return context.json({ createdL1, createdCards, errors }, errors.length && !createdL1 ? 422 : 201);
  });

  app.patch("/studio/l1/:id", async (context) => {
    const body = await context.req.json().catch(() => ({})) as Partial<ImportContentRow>;
    const l1 = content.updateL1(context.req.param("id"), {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      l0Ids: Array.isArray(body.l0Ids) ? body.l0Ids.filter((item): item is string => typeof item === "string") : undefined,
      minPlayers: Number.isInteger(body.minPlayers) ? body.minPlayers : undefined,
      maxPlayers: body.maxPlayers === null ? null : Number.isInteger(body.maxPlayers) ? body.maxPlayers : undefined,
      durationMin: body.durationMin === null ? null : Number.isInteger(body.durationMin) ? body.durationMin : undefined,
      durationMax: body.durationMax === null ? null : Number.isInteger(body.durationMax) ? body.durationMax : undefined,
      scenes: Array.isArray(body.scenes) ? body.scenes.filter((item): item is string => typeof item === "string") : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((item): item is string => typeof item === "string") : undefined,
      research: isRecord(body.research) ? body.research as Parameters<ContentRepository["updateL1"]>[1]["research"] : undefined
    });
    if (!l1) return context.json({ message: "Only draft or changes-requested L1 can be edited" }, 409);
    return context.json({ l1 });
  });

  app.get("/studio/overview", (context) => context.json(content.overview()));

  app.post("/studio/l1", async (context) => {
    const body = await context.req.json().catch(() => ({})) as Record<string, unknown>;
    const input = {
      code: typeof body.code === "string" ? body.code.trim() : "",
      name: typeof body.name === "string" ? body.name.trim() : "",
      l0Ids: Array.isArray(body.l0Ids) ? body.l0Ids.filter((item): item is string => typeof item === "string") : [],
      minPlayers: Number(body.minPlayers),
      maxPlayers: body.maxPlayers === null ? null : Number(body.maxPlayers),
      durationMin: body.durationMin === null ? null : Number(body.durationMin),
      durationMax: body.durationMax === null ? null : Number(body.durationMax),
      outcomeModel: body.outcomeModel,
      certificateEligible: body.certificateEligible !== false,
      tags: Array.isArray(body.tags) ? body.tags.filter((item): item is string => typeof item === "string") : [],
      scenes: Array.isArray(body.scenes) ? body.scenes.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [],
      research: isRecord(body.research) ? body.research as Parameters<ContentRepository["createL1"]>[0]["research"] : undefined
    } as Parameters<ContentRepository["createL1"]>[0];
    if (!input.code || !input.name || !outcomeModelSchema.safeParse(input.outcomeModel).success || !Number.isInteger(input.minPlayers) || input.minPlayers < 1 || (input.maxPlayers !== null && (!Number.isInteger(input.maxPlayers) || input.maxPlayers < input.minPlayers))) {
      return context.json({ message: "code, name and valid player range are required" }, 422);
    }
    const l1 = content.createL1(input);
    if (!l1) return context.json({ message: "L1 code or name already exists" }, 409);
    return context.json({ l1 }, 201);
  });

  app.post("/studio/l2", async (context) => {
    const body = await context.req.json().catch(() => ({})) as Record<string, unknown>;
    const contentType = l2ContentTypeSchema.safeParse(body.contentType);
    const reusePolicy = body.reusePolicy === undefined ? undefined : l2ReusePolicySchema.safeParse(body.reusePolicy);
    if (!contentType.success || (reusePolicy && !reusePolicy.success) || typeof body.l1Id !== "string" || typeof body.title !== "string" || !body.title.trim()) {
      return context.json({ message: "l1Id, title, contentType and a valid reuse policy are required" }, 422);
    }
    const l2 = content.createL2({
      l1Id: typeof body.l1Id === "string" ? body.l1Id : "",
      title: typeof body.title === "string" ? body.title.trim() : "",
      contentType: contentType.data,
      payload: body.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload as Record<string, unknown> : {},
      qualityTier: body.qualityTier === undefined ? undefined : Number(body.qualityTier),
      reusePolicy: reusePolicy?.data,
      toolIds: Array.isArray(body.toolIds) ? body.toolIds.filter((item): item is string => typeof item === "string") : undefined,
      sourceMode: body.sourceMode as Parameters<ContentRepository["createL2"]>[0]["sourceMode"]
    });
    if (!l2) return context.json({ message: "L1 not found or invalid L2 payload" }, 422);
    return context.json({ l2 }, 201);
  });

  app.patch("/studio/l2/:id", async (context) => {
    const body = await context.req.json().catch(() => ({})) as Record<string, unknown>;
    const contentType = body.contentType === undefined ? undefined : l2ContentTypeSchema.safeParse(body.contentType);
    if (contentType && !contentType.success) return context.json({ message: "Invalid L2 content type" }, 422);
    if (body.payload !== undefined && (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload))) {
      return context.json({ message: "payload must be an object" }, 422);
    }
    const l2 = content.updateDraftL2(context.req.param("id"), {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      contentType: contentType?.data,
      payload: body.payload as Record<string, unknown> | undefined,
      qualityTier: body.qualityTier === undefined ? undefined : Number(body.qualityTier),
      sourceMode: body.sourceMode as Parameters<ContentRepository["updateDraftL2"]>[1]["sourceMode"]
    });
    if (!l2) return context.json({ message: "Only draft or changes-requested L2 content can be edited" }, 409);
    return context.json({ l2 });
  });

  app.post("/studio/l1/:id/versions", async (context) => {
    const version = content.createVersion(context.req.param("id"), await context.req.json().catch(() => ({})));
    if (!version) return context.json({ message: "L1 not found" }, 404);
    return context.json({ version }, 201);
  });

  app.patch("/studio/versions/:id", async (context) => {
    const version = content.updateDraftVersion(context.req.param("id"), await context.req.json().catch(() => ({})));
    if (!version) return context.json({ message: "Only draft or changes-requested versions can be edited" }, 409);
    return context.json({ version });
  });

  app.post("/studio/versions/:id/submit", (context) => {
    const version = content.submitVersion(context.req.param("id"));
    if (!version) return context.json({ message: "Version must be a draft or changes-requested version" }, 409);
    return context.json({ version });
  });

  app.post("/studio/versions/:id/review", async (context) => {
    const body = await context.req.json().catch(() => ({})) as { decision?: ContentReviewDecision };
    if (!body.decision) return context.json({ message: "decision is required" }, 422);
    const version = content.reviewVersion(context.req.param("id"), body.decision);
    if (!version) return context.json({ message: "Version or decision not found" }, 404);
    return context.json({ version });
  });

  app.post("/studio/versions/:id/publish", (context) => {
    const version = content.publishVersion(context.req.param("id"));
    if (!version) return context.json({ message: "Version must be approved before publishing" }, 409);
    return context.json({ version });
  });

  app.post("/studio/l2/:id/submit", (context) => {
    const l2 = content.submitL2(context.req.param("id"));
    if (!l2) return context.json({ message: "L2 must be draft or changes-requested" }, 409);
    return context.json({ l2 });
  });

  app.post("/studio/l2/:id/review", async (context) => {
    const body = await context.req.json().catch(() => ({})) as { decision?: ContentReviewDecision };
    if (!body.decision) return context.json({ message: "decision is required" }, 422);
    const l2 = content.reviewL2(context.req.param("id"), body.decision);
    if (!l2) return context.json({ message: "L2 or decision not found" }, 404);
    return context.json({ l2 });
  });

  app.post("/studio/l2/:id/publish", (context) => {
    const l2 = content.publishL2(context.req.param("id"));
    if (!l2) return context.json({ message: "L2 must be approved before publishing" }, 409);
    return context.json({ l2 });
  });

  app.patch("/studio/l2/:id/reuse-policy", async (context) => {
    const body = await context.req.json().catch(() => ({})) as { policy?: unknown; actor?: string };
    const audit = content.updateReusePolicy(context.req.param("id"), body.policy as Parameters<ContentRepository["updateReusePolicy"]>[1], body.actor);
    if (!audit) return context.json({ message: "L2 or reuse policy not found" }, 422);
    return context.json({ audit });
  });

  app.get("/studio/l2/:id/reuse-policy/audits", (context) => context.json({ audits: content.listReuseAudits(context.req.param("id")) }));

  app.post("/studio/l2/:id/reuse-policy/rollback", async (context) => {
    const body = await context.req.json().catch(() => ({})) as { auditId?: string; actor?: string };
    if (!body.auditId) return context.json({ message: "auditId is required" }, 422);
    const audit = content.rollbackReusePolicy(context.req.param("id"), body.auditId, body.actor);
    if (!audit) return context.json({ message: "L2 or audit not found" }, 404);
    return context.json({ audit });
  });

  app.get("/studio/analytics/content", (context) => {
    const window = context.req.query("window");
    const range = window === "7d" || window === "30d" ? window : "all";
    return context.json(content.analytics(range));
  });
}
