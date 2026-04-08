// Azure AD / MSAL configuration.
// These values are populated from .env.local when Microsoft 365
// login is enabled. Until then the app runs without authentication.

export const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "common"}`,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI ?? "http://localhost:3000",
    postLogoutRedirectUri: "/",
  },
};

export const loginRequest = {
  scopes: [
    "https://analysis.windows.net/powerbi/api/Report.Read.All",
    "https://analysis.windows.net/powerbi/api/Dataset.Read.All",
    "User.Read",
    "openid",
    "profile",
  ],
};

export const powerBiScopes = [
  "https://analysis.windows.net/powerbi/api/Report.Read.All",
];
