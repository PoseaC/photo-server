// Page-side bridge to the background upload service worker (src/sw.ts).
//
// It registers the worker, hands off selected files for uploading, relays the
// worker's progress/done/error/cancel messages to the UI, and lets a reopened
// page re-attach to an upload that is already in progress.

import { UploadProgress } from "./immich";
import { addRecords } from "./uploadQueue";

export interface UploadCallbacks {
  onProgress?: (progress: UploadProgress) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
  onCancelled?: () => void;
  onIdle?: () => void;
}

let callbacks: UploadCallbacks = {};
let listenerAttached = false;

// Once a background (service worker) upload fails on this device, stop using it
// for the rest of the session and use the in-page uploader instead. Some
// devices (notably Android) cannot reliably persist/read the selected file via
// IndexedDB; the in-page uploader reads the File directly and always works.
let inPagePreferred = false;

export function disableBackgroundUpload(): void {
  inPagePreferred = true;
}

export function backgroundUploadDisabled(): boolean {
  return inPagePreferred;
}

// Service workers require a secure context (https or localhost). When that is
// not available we fall back to the in-page uploader.
export function backgroundUploadSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    (typeof window === "undefined" || window.isSecureContext !== false)
  );
}

export function setUploadCallbacks(cb: UploadCallbacks): void {
  callbacks = cb;
}

function attachListener(): void {
  if (listenerAttached || !backgroundUploadSupported()) return;
  listenerAttached = true;
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    const data = (event.data || {}) as { type?: string; progress?: UploadProgress; message?: string };
    switch (data.type) {
      case "upload-progress":
        if (data.progress) callbacks.onProgress?.(data.progress);
        break;
      case "upload-done":
        callbacks.onDone?.();
        break;
      case "upload-error":
        callbacks.onError?.(data.message || "Upload failed.");
        break;
      case "upload-cancelled":
        callbacks.onCancelled?.();
        break;
      case "upload-idle":
        callbacks.onIdle?.();
        break;
    }
  });
}

export async function registerUploadServiceWorker(): Promise<void> {
  if (!backgroundUploadSupported()) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
    attachListener();
  } catch (err) {
    console.error("Service worker registration failed", err);
  }
}

async function activeWorker(): Promise<ServiceWorker | null> {
  if (!backgroundUploadSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.active || navigator.serviceWorker.controller;
}

// Persists the selected files, then asks the worker to start uploading.
//
// The files are written to IndexedDB HERE, on the page, because a File from an
// <input> is only reliably readable in the document that owns it. Persisting it
// in the worker (after a postMessage transfer) intermittently fails on Android
// with "DataError: Failed to write blobs (InvalidBlob)". If persistence still
// fails, we return false so the caller falls back to the in-page uploader,
// which reads the File directly (no IndexedDB) — the upload always proceeds.
export async function startBackgroundUpload(files: File[], key: string): Promise<boolean> {
  const worker = await activeWorker();
  if (!worker) return false;
  attachListener();
  try {
    await addRecords(files, key);
  } catch (err) {
    console.error("Persisting upload queue failed; falling back to in-page upload", err);
    return false;
  }
  worker.postMessage({ type: "process" });
  return true;
}

export async function cancelBackgroundUpload(): Promise<void> {
  const worker = await activeWorker();
  worker?.postMessage({ type: "cancel" });
}

// Asks the worker whether an upload is still running. If so, the worker replies
// with an "upload-progress" message (and keeps uploading), letting a reopened
// page resume showing the loading screen.
export async function requestUploadStatus(): Promise<void> {
  const worker = await activeWorker();
  worker?.postMessage({ type: "getStatus" });
}
