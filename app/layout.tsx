import React from "react";
import Providers from "./providers";
export const metadata = {
  title: "Interview Performance Coach",
  description: "Voice-based interview practice with AI feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-ipc-theme="dark">
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}