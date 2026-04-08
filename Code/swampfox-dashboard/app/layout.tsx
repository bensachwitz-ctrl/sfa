import type { Metadata } from "next";
import "./globals.css";
import MsalClientProvider from "@/components/MsalClientProvider";
import AuthWrapper from "@/components/AuthWrapper";
import Sidebar from "@/components/Sidebar";
import { CompanySearchProvider } from "@/contexts/CompanySearchContext";

export const metadata: Metadata = {
  title: "Swamp Fox Agency Dashboard",
  description: "Insurance intelligence dashboard — claims, policies, drivers, and risk analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MsalClientProvider>
          <AuthWrapper>
            <CompanySearchProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="page-content w-full">{children}</div>
              </div>
            </CompanySearchProvider>
          </AuthWrapper>
        </MsalClientProvider>
      </body>
    </html>
  );
}
