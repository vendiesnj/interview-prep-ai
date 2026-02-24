import React from "react";
import Providers from "./providers";
export const metadata = {
  title: "Interview Performance Coach",
  description: "Voice-based interview practice with AI feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "rgb(3,7,18)",
          color: "#E5E7EB",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <Providers>
        {children}
</Providers>
      </body>
    </html>
  );
}