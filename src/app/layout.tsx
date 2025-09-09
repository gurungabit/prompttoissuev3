import "./globals.css";
import { AppFrame } from "../components/AppFrame";
import { ToastProvider } from "../components/Toast";
import { SettingsProvider } from "../context/Settings";
import { ThreadSelectionProvider } from "../context/ThreadSelection";
import { ThemeProvider } from "../ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
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
