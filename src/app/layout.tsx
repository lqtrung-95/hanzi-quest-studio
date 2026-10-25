import type { Metadata } from "next";
import "./globals.css";
import "./image-generation.css";
export const metadata: Metadata = { title: "Hanzi Quest Studio", description: "Create local AI-powered Mandarin learning content." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
