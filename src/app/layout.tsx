import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import SessionHydrator from "@/components/auth/SessionHydrator";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "SlickHood",
  description: "A property management system",
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
</body>
    </html>
  );
}
