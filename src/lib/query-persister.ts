import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

// Guarda o cache do React Query no IndexedDB do aparelho, para o app mostrar
// o que já foi carregado mesmo sem internet.
const DB_NAME = "caminho-cache";
const STORE = "kv";
const KEY = "react-query";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

let pending: PersistedClient | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export const idbPersister: Persister = {
  // O cache muda muitas vezes seguidas; grava no máximo uma vez por segundo.
  persistClient(client) {
    pending = client;
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        const toSave = pending;
        pending = null;
        if (toSave) void run("readwrite", (s) => s.put(toSave, KEY)).catch(() => {});
      }, 1000);
    }
  },
  restoreClient: () =>
    run<PersistedClient | undefined>("readonly", (s) => s.get(KEY)).catch(() => undefined),
  async removeClient() {
    pending = null;
    if (timer) clearTimeout(timer);
    timer = null;
    await run("readwrite", (s) => s.delete(KEY)).catch(() => {});
  },
};

export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 dias
