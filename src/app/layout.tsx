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
  openGraph: { siteName: "Slickhood", type: "website" },
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
        <main className="w-full h-full">
          {children}
        </main>
        <HelpChatBox />
</body>
    </html>
  );
}
