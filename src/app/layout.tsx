import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import SessionHydrator from "@/components/auth/SessionHydrator";
import HelpChatBox from "@/components/helpdesk/HelpChatBox";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://slickhood.com"),
  title: { default: "Slickhood | Property, community and everyday services", template: "%s | Slickhood" },
  description: "Slickhood connects property management, estates, property sales, wealth, visitors, Marketplace: Soko & Services, affiliates and partner insurance in one trusted ecosystem.",
  openGraph: {
    title: "Slickhood | Property, community and everyday services",
    description: "Manage property, enable communities and access everyday services through one connected ecosystem.",
    url: "/",
    siteName: "Slickhood",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Slickhood | Property, community and everyday services",
    description: "Manage property, enable communities and access everyday services through one connected ecosystem.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.className} antialiased flex items-start justify-between`}>
        <SessionHydrator />
        <div className="h-full w-full">
          {children}
        </div>
        <HelpChatBox />
</body>
    </html>
  );
}
