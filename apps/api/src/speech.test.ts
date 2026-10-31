import { strict as assert } from "node:assert";
import { SpeechConfigurationError, SpeechInputError, SpeechProviderError, type SpeechTranscriber } from "./speech.js";
import { createPlaybitApp, createRepositories } from "./app.js";

const audio = new Uint8Array([82, 73, 70, 70]);

async function request(transcribe: SpeechTranscriber, body: BodyInit = audio, contentType = "audio/wav") {
  const app = createPlaybitApp(createRepositories(null), [], transcribe);
  return app.request("/speech/transcribe", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body
  });
}

const successful = await request(async input => {
  assert.deepEqual([...input.audio], [...audio]);
  assert.equal(input.mimeType, "audio/wav");
  return { text: "先说好谁洗碗", requestId: "request-test" };
});
assert.equal(successful.status, 200);
assert.deepEqual(await successful.json(), { text: "先说好谁洗碗", requestId: "request-test" });

const empty = await request(async () => ({ text: "不会被调用", requestId: null }), new Uint8Array());
assert.equal(empty.status, 422);
assert.deepEqual(await empty.json(), { code: "EMPTY_AUDIO", message: "Audio is required" });

const invalid = await request(async () => { throw new SpeechInputError("unsupported"); });
assert.equal(invalid.status, 422);
assert.deepEqual(await invalid.json(), { code: "INVALID_AUDIO", message: "Audio format is not supported" });

const notConfigured = await request(async () => { throw new SpeechConfigurationError("missing credentials"); });
assert.equal(notConfigured.status, 503);
assert.deepEqual(await notConfigured.json(), { code: "ASR_NOT_CONFIGURED", message: "Speech transcription is not configured" });

const unavailable = await request(async () => { throw new SpeechProviderError("upstream details stay private"); });
assert.equal(unavailable.status, 502);
assert.deepEqual(await unavailable.json(), { code: "ASR_UNAVAILABLE", message: "Speech transcription is temporarily unavailable" });

console.log("Speech transcription route passed: success, validation, configuration and provider failures.");
