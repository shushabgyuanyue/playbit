import { bodyLimit } from "hono/body-limit";
import type { Hono } from "hono";
import { SpeechConfigurationError, SpeechInputError, SpeechProviderError, type SpeechTranscriber } from "../speech.js";

export function registerSpeechRoutes(app: Hono, transcribe: SpeechTranscriber) {
  app.post("/speech/transcribe", bodyLimit({ maxSize: 4 * 1024 * 1024 }), async context => {
    const audio = new Uint8Array(await context.req.arrayBuffer());
    if (!audio.byteLength) return context.json({ code: "EMPTY_AUDIO", message: "Audio is required" }, 422);
    try {
      const result = await transcribe({ audio, mimeType: context.req.header("content-type") ?? "" });
      return context.json(result);
    } catch (error) {
      if (error instanceof SpeechInputError) return context.json({ code: "INVALID_AUDIO", message: "Audio format is not supported" }, 422);
      if (error instanceof SpeechConfigurationError) return context.json({ code: "ASR_NOT_CONFIGURED", message: "Speech transcription is not configured" }, 503);
      if (error instanceof SpeechProviderError) return context.json({ code: "ASR_UNAVAILABLE", message: "Speech transcription is temporarily unavailable" }, 502);
      return context.json({ code: "ASR_UNAVAILABLE", message: "Speech transcription is temporarily unavailable" }, 502);
    }
  });
}
