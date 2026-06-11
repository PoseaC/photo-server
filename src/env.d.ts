declare global {
  const __GOOGLE_PHOTOS_SHARE_LINK__: string;
  const __GOOGLE_OAUTH_CLIENT_ID__: string;

  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export {};
