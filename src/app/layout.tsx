import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";

import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/900.css";
import "react-multi-date-picker/styles/layouts/mobile.css";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "InvoiceFlow | مدیریت فاکتور",
    template: "%s | InvoiceFlow",
  },
  description: "سامانه متن‌باز ثبت، بررسی، پرداخت و بایگانی فاکتورهای سازمانی",
  applicationName: "InvoiceFlow",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster dir="rtl" richColors position="top-center" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
