/// <reference path="./env.d.ts" />

// Background upload service worker.
//
// Guests can select many photos/videos; uploading them can take a while. To
// keep uploading even after the user switches apps, locks the phone, or closes
// the tab, the actual upload work lives HERE (in the service worker) instead of
// on the page:
//
//   * Selected files are persisted in IndexedDB, so they survive a page reload
//     or the worker being killed and restarted.
//   * Uploads run with a small concurrency pool + retry (mirroring the in-page
//     uploader) using `fetch` (XMLHttpRequest is not available in workers).
//   * `event.waitUntil(...)` keeps the worker alive while uploads are in flight,
//     so they continue after the page is closed. A Background Sync registration
//     is used as a best-effort safety net to resume after the worker is killed.
//   * Progress is broadcast to every open page via postMessage so the loading
//     screen can re-attach after a reload.
//
// NOTE: `fetch` cannot report request-body (upload) byte progress, so progress
// here is file-count based (percent = uploaded bytes of COMPLETED files). This
// is the trade-off for gaining true background persistence.

import {
  UploadProgress,
  buildUploadFormData,
  assetsUploadUrl,
  isRetryableHttpError,
  MAX_ATTEMPTS,
  BASE_BACKOFF_MS,
} from "./immich";
import { QueueRecord, getAllRecords, markDone, clearAll } from "./uploadQueue";

// The service-worker global scope is not in the project's TS lib set, so we
// access worker-only APIs (clients, registration.sync, skipWaiting, ...)
// through a loosely-typed handle to avoid pulling in the "webworker" lib (which
// conflicts with the "dom" lib used by the rest of the app).
const sw = self as unknown as any;

const SYNC_TAG = "wedding-upload-sync";

// Number of files uploaded in parallel. Kept low (matching the in-page
// uploader) so many simultaneous guests don't overwhelm the server.
const UPLOAD_CONCURRENCY = 3;

// The queue is persisted in IndexedDB (see src/uploadQueue.ts). Records are
// WRITTEN from the page; the worker only reads/updates/clears them here.

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

async function broadcast(message: unknown): Promise<void> {
  const clients = await sw.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of clients) client.postMessage(message);
}

async function reportProgress(): Promise<void> {
  const records = await getAllRecords();
  const total = records.length;
  if (total === 0) return;
  const totalBytes = records.reduce((sum, r) => sum + r.size, 0) || 1;
  const completed = records.filter((r) => r.done === 1);
  const doneBytes = completed.reduce((sum, r) => sum + r.size, 0);
  const progress: UploadProgress = {
    done: completed.length,
    total,
    percent: Math.min(100, Math.round((doneBytes / totalBytes) * 100)),
    currentFileName: currentName,
  };
  await broadcast({ type: "upload-progress", progress });
}

// ---------------------------------------------------------------------------
// Uploading
// ---------------------------------------------------------------------------

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function uploadOnce(record: QueueRecord, signal: AbortSignal): Promise<void> {
  const response = await fetch(assetsUploadUrl(record.key), {
    method: "POST",
    body: buildUploadFormData(record.file),
    signal,
  });
  // 201 = created, 200 = duplicate (Immich dedupes by checksum). Both succeed.
  if (response.status >= 200 && response.status < 300) return;
  const err = new Error(`Upload failed (HTTP ${response.status}) for ${record.name}.`);
  (err as Error & { status?: number }).status = response.status;
  throw err;
}

async function uploadWithRetry(record: QueueRecord, signal: AbortSignal): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await uploadOnce(record, signal);
      return;
    } catch (err) {
      if (signal.aborted) throw err;
      const status = (err as { status?: number }).status;
      const retryable = status === undefined || isRetryableHttpError(status);
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      lastErr = err;
      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await sleep(delay, signal);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Queue processing
// ---------------------------------------------------------------------------

let processing = false;
let cancelled = false;
let currentName = "";
let abortController: AbortController | null = null;

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  cancelled = false;
  abortController = new AbortController();
  const signal = abortController.signal;

  try {
    while (!cancelled) {
      const pending = (await getAllRecords()).filter((r) => r.done === 0);

      if (pending.length === 0) {
        await reportProgress();
        await clearAll();
        await broadcast({ type: "upload-done" });
        return;
      }

      let nextIndex = 0;
      let failure: unknown = null;
      let stop = false;

      const worker = async (): Promise<void> => {
        while (!cancelled && !stop && !signal.aborted) {
          const index = nextIndex++;
          if (index >= pending.length) return;
          const record = pending[index];
          currentName = record.name;
          await reportProgress();
          try {
            await uploadWithRetry(record, signal);
            await markDone(record.id!);
            await reportProgress();
          } catch (err) {
            if (cancelled || signal.aborted) return;
            failure = err;
            stop = true;
            return;
          }
        }
      };

      const poolSize = Math.min(UPLOAD_CONCURRENCY, pending.length);
      await Promise.all(Array.from({ length: poolSize }, () => worker()));

      if (failure) {
        // The batch failed after retries. Clear the queue so the failed records
        // are NOT re-counted or re-processed on the next upload (which used to
        // make each retry accumulate the previous, stuck files). The page falls
        // back to the in-page uploader for this selection.
        await clearAll();
        await broadcast({
          type: "upload-error",
          message: (failure as Error)?.message || "Upload failed.",
        });
        return;
      }
      // Loop again to pick up any files enqueued while we were uploading.
    }
  } finally {
    processing = false;
    abortController = null;
    currentName = "";
  }
}

// ---------------------------------------------------------------------------
// Service worker lifecycle + events
// ---------------------------------------------------------------------------

sw.addEventListener("install", () => sw.skipWaiting());

sw.addEventListener("activate", (event: any) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener("message", (event: any) => {
  const data = event.data || {};
  switch (data.type) {
    case "process":
      // The page has already persisted the selected files to IndexedDB. We
      // only need to (best-effort) register a Background Sync — which lets the
      // browser wake the worker to finish if it is killed mid-upload — and
      // start draining the queue.
      event.waitUntil(
        (async () => {
          try {
            await sw.registration.sync.register(SYNC_TAG);
          } catch (_) {
            /* Background Sync unavailable; the in-flight waitUntil still keeps
               the worker alive while uploading. */
          }
          await processQueue();
        })(),
      );
      break;

    case "getStatus":
      event.waitUntil(
        (async () => {
          const hasPending = (await getAllRecords()).some((r) => r.done === 0);
          if (hasPending) {
            await reportProgress();
            await processQueue();
          } else {
            await broadcast({ type: "upload-idle" });
          }
        })(),
      );
      break;

    case "cancel":
      cancelled = true;
      abortController?.abort();
      event.waitUntil(clearAll().then(() => broadcast({ type: "upload-cancelled" })));
      break;
  }
});

sw.addEventListener("sync", (event: any) => {
  if (event.tag === SYNC_TAG) event.waitUntil(processQueue());
});
