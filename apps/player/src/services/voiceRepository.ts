const databaseName = "playbit.voice-assets.v1";
const storeName = "voice-assets";

type VoiceAssetRecord = {
  id: string;
  blob: Blob;
  createdAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open voice storage"));
  });
}

export async function saveVoiceAsset(blob: Blob, id: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).put({ id, blob, createdAt: new Date().toISOString() } satisfies VoiceAssetRecord);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not save voice"));
  });
  database.close();
}

export async function loadVoiceAsset(id: string): Promise<Blob | null> {
  const database = await openDatabase();
  const result = await new Promise<VoiceAssetRecord | undefined>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result as VoiceAssetRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not load voice"));
  });
  database.close();
  return result?.blob ?? null;
}

export async function deleteVoiceAsset(id: string) {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not delete voice"));
  });
  database.close();
}
