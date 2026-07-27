import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "vorb-ui — voice state, rendered",
    template: "%s · vorb-ui",
  },
  description:
    "A small, stateful React orb for realtime voice interfaces. Five themes, provider adapters, and precise motion controls.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="dark" lang="en" suppressHydrationWarning>
      <body>
        <RootProvider search={{ enabled: false }} theme={{ enabled: false, defaultTheme: "dark" }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
