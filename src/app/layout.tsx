import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { PwaRegistration } from "@/components/pwa/PwaRegistration";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0B4DA2",
};

export const metadata: Metadata = {
  title: "Divine Financial Group | Your Trusted Partner in Financial Success",
  description:
    "Divine Financial Group offers expert Tax Preparation, Business Formation, Auto & Life Insurance, Notary Public Services, and Bookkeeping & Payroll for individuals and businesses in Delaware.",
  keywords: "tax preparation, business formation, auto insurance, notary, bookkeeping, Delaware, New Castle",
  manifest: "/manifest.json",
  applicationName: "DFG Portal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DFG Portal",
  },
  icons: {
    icon: [
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <ToastProvider>{children}</ToastProvider>
        <PwaRegistration />
      </body>
    </html>
  );
}
