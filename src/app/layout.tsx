import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppFrame } from "../components/AppFrame";
import { ToastProvider } from "../components/Toast";
import { SettingsProvider } from "../context/Settings";
import { ThreadSelectionProvider } from "../context/ThreadSelection";
import { ThemeProvider } from "../ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata can be added back here if needed; layout is server-side.

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SettingsProvider>
            <ToastProvider>
              <ThreadSelectionProvider>
                <AppFrame>{children}</AppFrame>
              </ThreadSelectionProvider>
            </ToastProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
