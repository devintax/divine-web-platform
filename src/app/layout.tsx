import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0B4DA2",
};

export const metadata: Metadata = {
  title: "Divine Financial Group | Your Trusted Partner in Financial Success",
  description:
    "Divine Financial Group offers expert Tax Preparation, Business Formation, Auto & Life Insurance, Notary Public Services, and Bookkeeping & Payroll for individuals and businesses in Delaware.",
  keywords: "tax preparation, business formation, auto insurance, notary, bookkeeping, Delaware, New Castle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
