import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const googleSansCode = localFont({
  src: [
    {
      path: "../../public/assets/fonts/GoogleSansCode-VariableFont_MONO,wght.ttf",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/GoogleSansCode-Italic-VariableFont_MONO,wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-jetbrains", // Keep the variable name to avoid refactoring all classes right now, or rename and update CSS. Let's rename to --font-google-sans-code
});

export const metadata: Metadata = {
  title: "ORB — Geospatial Command Center",
  description:
    "Next-gen geospatial intelligence platform combining ultra-HD 3D mapping with multispectral satellite analytics.",
  keywords: [
    "geospatial",
    "satellite",
    "Sentinel-2",
    "NDVI",
    "mapping",
    "Mapbox",
    "remote sensing",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${googleSansCode.variable} h-full`}
    >
      <body className="min-h-full bg-void text-neutral-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
