import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/theme/ThemeProvider";
import { THEME_INIT_SCRIPT } from "@/theme/theme-init";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flowdesk",
  description: "Modern operations and timesheet platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className={`${inter.variable} bg-background text-textPrimary`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
