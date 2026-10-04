"use client";

/**
 * Election-day submissions are saved on the phone first (IndexedDB), then sent.
 * Anything that fails because of the network stays queued and is retried automatically.
 */
import {
  submitElectionCheckin,
  submitElectionIncident,
  submitElectionResult,
  uploadElectionPhoto,
  type CheckinSubmission,
  type IncidentSubmission,
  type ResultSubmission,
} from "@/app/actions/election";
import type { ElectionActionResult } from "@/lib/elections/shared";

export type QueueItem =
  | (QueueBase & { kind: "result"; payload: Omit<ResultSubmission, "photoPaths">; keptPhotoPaths: string[] })
  | (QueueBase & { kind: "incident"; payload: Omit<IncidentSubmission, "photoPaths">; keptPhotoPaths: string[] })
  | (QueueBase & { kind: "checkin"; payload: CheckinSubmission; keptPhotoPaths: string[] });

interface QueueBase {
  id: string;
  electionId: string;
  /** Shown to the agent, e.g. "Result — Ward 3 PU 004". */
  label: string;
  /** Photos still to upload keep their data URL; uploaded ones keep only the storage path. */
  photos: { dataUrl?: string; path?: string }[];
  status: "pending" | "failed";
  error?: string;
  attempts: number;
  createdAt: number;
}

const DB_NAME = "sdp-election";
const STORE = "queue";
const memoryStore = new Map<string, QueueItem>();
const listeners = new Set<() => void>();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function listQueue(): Promise<QueueItem[]> {
  const items = (await withStore<QueueItem[]>("readonly", (s) => s.getAll() as IDBRequest<QueueItem[]>)) ??
    Array.from(memoryStore.values());
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

async function putItem(item: QueueItem) {
  const saved = await withStore("readwrite", (s) => s.put(item)).catch(() => null);
  if (saved === null) memoryStore.set(item.id, item);
}

async function deleteItem(id: string) {
  await withStore("readwrite", (s) => s.delete(id)).catch(() => null);
  memoryStore.delete(id);
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function enqueue(item: Omit<QueueItem, "id" | "status" | "attempts" | "createdAt">) {
  const full = { ...item, id: newClientId(), status: "pending", attempts: 0, createdAt: Date.now() } as QueueItem;
  await putItem(full);
  notify();
  void processQueue();
  return full.id;
}

export async function retryItem(id: string) {
  const item = (await listQueue()).find((i) => i.id === id);
  if (!item) return;
  await putItem({ ...item, status: "pending", error: undefined });
  notify();
  void processQueue();
}

export async function discardItem(id: string) {
  await deleteItem(id);
  notify();
}

type SentListener = (item: QueueItem) => void;
const sentListeners = new Set<SentListener>();
export function onItemSent(listener: SentListener): () => void {
  sentListeners.add(listener);
  return () => sentListeners.delete(listener);
}

class RetryLater extends Error {}
/** The server rejected the submission; the agent must fix or discard it. */
class Rejected extends Error {}

function unwrap<T>(res: ElectionActionResult<T>): asserts res is { ok: true } & T {
  if (res.ok) return;
  if (res.retry === false) throw new Rejected(res.error);
  throw new RetryLater(res.error);
}

async function send(item: QueueItem): Promise<void> {
  for (const photo of item.photos) {
    if (photo.path || !photo.dataUrl) continue;
    const res = await uploadElectionPhoto({ electionId: item.electionId, dataUrl: photo.dataUrl });
    unwrap(res);
    photo.path = res.path;
    delete photo.dataUrl;
    await putItem(item);
  }
  const photoPaths = [...item.keptPhotoPaths, ...item.photos.map((p) => p.path!).filter(Boolean)];
  if (item.kind === "result") unwrap(await submitElectionResult({ ...item.payload, photoPaths }));
  else if (item.kind === "incident") unwrap(await submitElectionIncident({ ...item.payload, photoPaths }));
  else unwrap(await submitElectionCheckin(item.payload));
}

let running = false;

/** Send everything waiting. Stops early when the network is down. */
export async function processQueue(): Promise<void> {
  if (running) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  running = true;
  try {
    for (const item of await listQueue()) {
      if (item.status === "failed") continue;
      try {
        await send(item);
        await deleteItem(item.id);
        sentListeners.forEach((l) => l(item));
      } catch (err) {
        if (err instanceof Rejected) {
          await putItem({ ...item, status: "failed", error: err.message });
        } else if (err instanceof RetryLater) {
          await putItem({ ...item, attempts: item.attempts + 1, error: err.message });
        } else {
          // Thrown by the request itself: no connection, timeout or server unreachable.
          await putItem({ ...item, attempts: item.attempts + 1, error: "Waiting for network…" });
          notify();
          break;
        }
      }
      notify();
    }
  } finally {
    running = false;
    notify();
  }
}
