import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Market Studio | Business Ads in 3–4 Days", description: "Order professional product promos, social ads, and 3D showcase videos through one fast client portal.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard"><html lang="en"><body>{children}</body></html></ClerkProvider>; }
