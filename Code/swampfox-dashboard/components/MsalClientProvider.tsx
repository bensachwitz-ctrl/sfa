"use client";

// MSAL is only initialized when Azure AD credentials are configured.
// Without them the app runs in open/dev mode — no login required.

export default function MsalClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
