import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/atlas-ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cryo Protocol Atlas",
  description: "Internal console for benchmarked cryopreservation protocol analysis."
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
