import { Client as TencentAsrClient } from "tencentcloud-sdk-nodejs-asr/tencentcloud/services/asr/v20190614/asr_client.js";

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

export type SpeechTranscriptionInput = {
  audio: Uint8Array;
  mimeType: string;
};

export type SpeechTranscription = {
  text: string;
  requestId: string | null;
};

export type SpeechTranscriber = (input: SpeechTranscriptionInput) => Promise<SpeechTranscription>;

export class SpeechConfigurationError extends Error {}
export class SpeechInputError extends Error {}
export class SpeechProviderError extends Error {}

function voiceFormat(mimeType: string) {
  const mime = mimeType.toLowerCase().split(";", 1)[0];
  if (mime === "audio/wav" || mime === "audio/x-wav") return "wav";
  if (mime === "audio/mpeg" || mime === "audio/mp3") return "mp3";
  if (mime === "audio/mp4" || mime === "audio/x-m4a") return "m4a";
  if (mime === "audio/ogg") return "ogg-opus";
  if (mime === "audio/aac") return "aac";
  if (mime === "audio/amr") return "amr";
  throw new SpeechInputError("Unsupported audio format");
}

export function createSpeechTranscriber(): SpeechTranscriber {
  let client: TencentAsrClient | null = null;

  function getClient() {
    if (client) return client;
    const secretId = process.env.TENCENTCLOUD_SECRET_ID?.trim();
    const secretKey = process.env.TENCENTCLOUD_SECRET_KEY?.trim();
    if (!secretId || !secretKey) {
      throw new SpeechConfigurationError("Tencent ASR credentials are not configured");
    }
    client = new TencentAsrClient({
      credential: { secretId, secretKey },
      region: process.env.TENCENTCLOUD_REGION?.trim() || "ap-guangzhou"
    });
    return client;
  }

  return async ({ audio, mimeType }) => {
    if (audio.byteLength === 0) throw new SpeechInputError("Audio is empty");
    if (audio.byteLength > MAX_AUDIO_BYTES) throw new SpeechInputError("Audio is too large");
    const format = voiceFormat(mimeType);
    try {
      const response = await getClient().SentenceRecognition({
        EngSerViceType: process.env.TENCENT_ASR_ENGINE?.trim() || "16k_zh",
        SourceType: 1,
        VoiceFormat: format,
        Data: Buffer.from(audio).toString("base64"),
        DataLen: audio.byteLength,
        WordInfo: 0
      });
      const text = response.Result?.trim();
      if (!text) throw new SpeechProviderError("Tencent ASR returned no text");
      return { text, requestId: response.RequestId ?? null };
    } catch (error) {
      if (error instanceof SpeechProviderError || error instanceof SpeechConfigurationError || error instanceof SpeechInputError) throw error;
      throw new SpeechProviderError("Tencent ASR request failed");
    }
  };
}
