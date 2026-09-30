import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Chaming — Turn Docs into AI Chat",
  description: "Upload your docs, get an API key, paste one line of script. AI Chaming turns your knowledge base into a chat widget your visitors can talk to — no engineering team required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased text-charcoal selection:bg-sage-300 selection:text-charcoal">
        {children}
      </body>
    </html>
  );
}
