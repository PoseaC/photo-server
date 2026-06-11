/// <reference path="./env.d.ts" />

const IMMICH_BASE_URL = __IMMICH_BASE_URL__.replace(/\/+$/, "");
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
  const url = `${IMMICH_BASE_URL}/api/shared-links/me?slug=${encodeURIComponent(IMMICH_SHARE_SLUG)}`;
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
function isRetryableHttpError(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
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

const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 800;

async function uploadOnce(
  file: File,
  key: string,
  signal?: AbortSignal,
): Promise<void> {
  const created = new Date(file.lastModified || Date.now()).toISOString();
  const body = new FormData();
  body.append("deviceAssetId", `${file.name}-${file.size}-${file.lastModified}`);
  body.append("deviceId", "wedding-web-uploader");
  body.append("fileCreatedAt", created);
  body.append("fileModifiedAt", created);
  body.append("isFavorite", "false");
  body.append("assetData", file, file.name);

  const url = `${IMMICH_BASE_URL}/api/assets?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { method: "POST", body, signal });
  if (response.ok) return; // 200 (duplicate) or 201 (created)

  const text = await response.text().catch(() => "");
  const err = new Error(
    `Upload failed (HTTP ${response.status}) for ${file.name}: ${text.slice(0, 200)}`,
  );
  (err as Error & { status?: number }).status = response.status;
  throw err;
}

async function uploadWithRetry(
  file: File,
  key: string,
  signal?: AbortSignal,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await uploadOnce(file, key, signal);
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
  currentFileName: string;
}

export async function uploadFiles(
  files: File[],
  key: string,
  options: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal } = {},
): Promise<void> {
  const { onProgress, signal } = options;
  if (files.length === 0) throw new Error("No files selected.");
  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const file = files[i];
    onProgress?.({ done: i, total: files.length, currentFileName: file.name });
    await uploadWithRetry(file, key, signal);
  }
  onProgress?.({ done: files.length, total: files.length, currentFileName: "" });
}
