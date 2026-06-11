/// <reference path="./env.d.ts" />

const PHOTOS_SCOPE = "https://www.googleapis.com/auth/photoslibrary.sharing";

export const GOOGLE_PHOTOS_SHARE_LINK = __GOOGLE_PHOTOS_SHARE_LINK__;
export const GOOGLE_OAUTH_CLIENT_ID = __GOOGLE_OAUTH_CLIENT_ID__;

export function assertGooglePhotosConfig() {
  if (!GOOGLE_PHOTOS_SHARE_LINK) {
    throw new Error("Missing GOOGLE_PHOTOS_SHARE_LINK env var.");
  }
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID env var.");
  }
}

function extractShareToken(shareLink: string): string {
  // Handle long-form links: https://photos.google.com/share/AF1QipN...
  const longMatch = shareLink.match(/photos\.google\.com\/share\/([A-Za-z0-9_-]+)/);
  if (longMatch) {
    return longMatch[1];
  }
  // For short links (photos.app.goo.gl), the token is the path segment
  const shortMatch = shareLink.match(/photos\.app\.goo\.gl\/([A-Za-z0-9_-]+)/);
  if (shortMatch) {
    return shortMatch[1];
  }
  throw new Error("Could not extract share token from link.");
}

export async function joinSharedAlbum(accessToken: string): Promise<string> {
  const shareToken = extractShareToken(GOOGLE_PHOTOS_SHARE_LINK);

  const response = await fetch("https://photoslibrary.googleapis.com/v1/sharedAlbums:join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ shareToken }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to join album: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.album.id;
}

export function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2?.initTokenClient) {
      reject(new Error("Google Identity Services not loaded."));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: PHOTOS_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "No access token received."));
          return;
        }
        resolve(response.access_token);
      },
      prompt: "consent",
    });

    client.requestAccessToken({ prompt: "consent" });
  });
}

async function uploadSingleFile(file: File, accessToken: string): Promise<string> {
  const uploadResponse = await fetch("https://photoslibrary.googleapis.com/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
      "X-Goog-Upload-File-Name": encodeURIComponent(file.name),
      "X-Goog-Upload-Protocol": "raw",
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
  }

  return uploadResponse.text();
}

export async function uploadFilesToAlbum(files: File[], accessToken: string, albumId: string): Promise<void> {
  if (files.length === 0) {
    throw new Error("No files selected.");
  }

  const uploadTokens: string[] = [];
  for (const file of files) {
    const token = await uploadSingleFile(file, accessToken);
    uploadTokens.push(token);
  }

  const batchResponse = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      albumId,
      newMediaItems: uploadTokens.map((uploadToken) => ({
        simpleMediaItem: { uploadToken },
      })),
    }),
  });

  if (!batchResponse.ok) {
    const errorText = await batchResponse.text();
    throw new Error(`Create media items failed: ${batchResponse.status} ${errorText}`);
  }
}
