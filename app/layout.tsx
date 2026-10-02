import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/instrument-serif/400.css";
import "./tokens.css";
import "./globals.css";
import "./product.css";
import "./connected.css";
import "./customer-site.css";
import "./release.css";
import "@fontsource/instrument-serif/400-italic.css";

export const metadata: Metadata = {
  title: "Fourthform client workspace",
  robots: { index: false, follow: false },
  description: "Websites, brought into form.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
