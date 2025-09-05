import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../ThemeProvider";
import { ThreadSelectionProvider } from "../context/ThreadSelection";
import { AppFrame } from "../components/AppFrame";
import { ToastProvider } from "../components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata can be added back here if needed; layout is server-side.

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <ThreadSelectionProvider>
              <AppFrame>{children}</AppFrame>
            </ThreadSelectionProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
