// Page-side bridge to the background upload service worker (src/sw.ts).
//
// It registers the worker, hands off selected files for uploading, relays the
// worker's progress/done/error/cancel messages to the UI, and lets a reopened
// page re-attach to an upload that is already in progress.

import { UploadProgress } from "./immich";

export interface UploadCallbacks {
  onProgress?: (progress: UploadProgress) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
  onCancelled?: () => void;
  onIdle?: () => void;
}

let callbacks: UploadCallbacks = {};
let listenerAttached = false;

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

// Hands the selected files to the worker. Returns false if no worker is
// available so the caller can fall back to the in-page uploader.
export async function startBackgroundUpload(files: File[], key: string): Promise<boolean> {
  const worker = await activeWorker();
  if (!worker) return false;
  attachListener();
  worker.postMessage({ type: "enqueue", files, key });
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
