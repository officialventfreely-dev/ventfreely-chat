import type { Metadata } from "next";
import "./globals.css";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";

const bodyFont = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const subheadingFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-subheading",
});

const headingFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Ventfreely",
  description:
    "Gentle emotional support for people who feel low, empty, or mentally tired. No therapy. No diagnosis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={[
          "antialiased",
          bodyFont.variable,
          subheadingFont.variable,
          headingFont.variable,
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}
