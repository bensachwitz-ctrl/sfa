"use client";

// Auth bypass — Azure AD login is enforced only when
// NEXT_PUBLIC_AZURE_CLIENT_ID is configured in .env.local.
// Until then the dashboard runs open for development.

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
