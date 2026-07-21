/// <reference path="./env.d.ts" />

const IMMICH_BASE_URL = __IMMICH_BASE_URL__.replace(/\/+$/, "");
// API calls use this base. It equals IMMICH_BASE_URL in production, but is empty
// (relative path) under the dev server so requests hit the local proxy and avoid
// CORS. The gallery link below always uses the absolute IMMICH_BASE_URL.
const IMMICH_API_BASE = __IMMICH_API_BASE__.replace(/\/+$/, "");
const IMMICH_SHARE_SLUG = __IMMICH_SHARE_SLUG__;

export const IMMICH_SHARE_URL = `${IMMICH_BASE_URL}/s/${IMMICH_SHARE_SLUG}`;

const SUPPORTED_IMAGE_EXTS = new Set([
  "avif", "bmp", "gif", "heic", "heif", "jp2", "jpeg", "jpg", "jpe", "insp",
  "jxl", "png", "psd", "raw", "rw2", "svg", "tif", "tiff", "webp",
]);

const SUPPORTED_VIDEO_EXTS = new Set([
  "3gp", "3gpp", "avi", "flv", "m4v", "mkv", "mts", "m2ts", "m2t", "ts",
  "mp4", "insv", "mpg", "mpe", "mpeg", "mxf", "mov", "webm", "wmv",
]);

export const ACCEPT_ATTR =
  [...SUPPORTED_IMAGE_EXTS, ...SUPPORTED_VIDEO_EXTS]
    .map((e) => `.${e}`)
    .join(",");

export function assertImmichConfig(): void {
  if (!IMMICH_BASE_URL) throw new Error("Missing IMMICH_BASE_URL.");
  if (!IMMICH_SHARE_SLUG) throw new Error("Missing IMMICH_SHARE_SLUG.");
}

function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

export function isSupportedFile(file: File): boolean {
  const ext = fileExtension(file.name);
  return SUPPORTED_IMAGE_EXTS.has(ext) || SUPPORTED_VIDEO_EXTS.has(ext);
}

let cachedShareKey: string | null = null;

export async function fetchShareKey(): Promise<string> {
  if (cachedShareKey) return cachedShareKey;
  const url = `${IMMICH_API_BASE}/api/shared-links/me?slug=${encodeURIComponent(IMMICH_SHARE_SLUG)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to resolve shared link (HTTP ${response.status}).`);
  }
  const data = await response.json();
  if (!data?.key) throw new Error("Shared link response missing key.");
  cachedShareKey = data.key as string;
  return cachedShareKey;
}

// Network errors and 5xx/429 are retryable; 4xx (other) are not.
export function isRetryableHttpError(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

// Builds the multipart body for a single asset upload. Shared between the
// in-page XHR uploader and the service-worker fetch uploader so both send an
// identical request shape.
export function buildUploadFormData(file: File): FormData {
  const created = new Date(file.lastModified || Date.now()).toISOString();
  const body = new FormData();
  body.append("fileCreatedAt", created);
  body.append("fileModifiedAt", created);
  body.append("isFavorite", "false");
  body.append("assetData", file, file.name);
  return body;
}

// The Immich upload endpoint for a given public share key.
export function assetsUploadUrl(key: string): string {
  return `${IMMICH_API_BASE}/api/assets?key=${encodeURIComponent(key)}`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export const MAX_ATTEMPTS = 4;
export const BASE_BACKOFF_MS = 800;

function uploadOnce(
  file: File,
  key: string,
  signal?: AbortSignal,
  onByteProgress?: (loaded: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const body = buildUploadFormData(file);

    // XMLHttpRequest (not fetch) is used so we can report upload progress
    // events, which fetch does not expose for request bodies.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", assetsUploadUrl(key));

    const onAbort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    signal?.addEventListener("abort", onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onByteProgress?.(event.loaded);
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onByteProgress?.(file.size); // 200 (duplicate) or 201 (created)
        resolve();
        return;
      }
      const err = new Error(
        `Upload failed (HTTP ${xhr.status}) for ${file.name}: ${String(xhr.responseText).slice(0, 200)}`,
      );
      (err as Error & { status?: number }).status = xhr.status;
      reject(err);
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error(`Network error while uploading ${file.name}.`));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    xhr.send(body);
  });
}

async function uploadWithRetry(
  file: File,
  key: string,
  signal?: AbortSignal,
  onByteProgress?: (loaded: number) => void,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      onByteProgress?.(0); // reset this file's progress at the start of each attempt
      await uploadOnce(file, key, signal, onByteProgress);
      return;
    } catch (err) {
      if (signal?.aborted) throw err;
      const status = (err as { status?: number }).status;
      const networkError = status === undefined;
      const retryable = networkError || (status !== undefined && isRetryableHttpError(status));
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      lastErr = err;
      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await sleep(delay, signal);
    }
  }
  throw lastErr;
}

export interface UploadProgress {
  done: number;
  total: number;
  percent: number;
  currentFileName: string;
}

// Number of files uploaded in parallel. A small pool fills a high-latency link
// (e.g. a tunnel) better than a single stream, matching Immich's own web
// uploader. Kept low so many simultaneous guests don't overwhelm the server.
const UPLOAD_CONCURRENCY = 3;

export async function uploadFiles(
  files: File[],
  key: string,
  options: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal } = {},
): Promise<void> {
  const { onProgress, signal } = options;
  const total = files.length;
  if (total === 0) throw new Error("No files selected.");

  // Byte-based progress: percent reflects bytes sent across all files, so a
  // single large file shows smooth progress instead of jumping 0% -> 100%.
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
  const loadedPerFile = new Array<number>(total).fill(0);

  let done = 0;
  let nextIndex = 0;
  let lastStartedName = "";

  const report = () => {
    const loaded = loadedPerFile.reduce((a, b) => a + b, 0);
    const percent = Math.min(100, Math.round((loaded / totalBytes) * 100));
    onProgress?.({ done, total, percent, currentFileName: lastStartedName });
  };

  const worker = async (): Promise<void> => {
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const index = nextIndex++;
      if (index >= total) return;
      const file = files[index];
      lastStartedName = file.name;
      report();
      await uploadWithRetry(file, key, signal, (loaded) => {
        loadedPerFile[index] = Math.min(loaded, file.size);
        report();
      });
      loadedPerFile[index] = file.size;
      done++;
      report();
    }
  };

  const poolSize = Math.min(UPLOAD_CONCURRENCY, total);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));

  onProgress?.({ done: total, total, percent: 100, currentFileName: "" });
}
