import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Robinhood Training",
  description: "Customer service onboarding and training platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="shell">{children}</body>
    </html>
  );
}
