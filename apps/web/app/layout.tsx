import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/atlas-ui";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cryo Protocol Atlas",
    template: "%s · Cryo Protocol Atlas"
  },
  description:
    "Read-only internal console for validated cryopreservation evidence, benchmark deltas, discovery signals, and debug lineage."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
