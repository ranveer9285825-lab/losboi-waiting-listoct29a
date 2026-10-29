import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "./AppShell";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://losboi.com";
const LOGO_URL =
  "https://iicnaktsggtwsucgddui.supabase.co/storage/v1/object/public/uploads/IMG_20261014_101127.png";
const OG_IMAGE_URL =
  "https://iicnaktsggtwsucgddui.supabase.co/storage/v1/object/public/uploads/losboi_social_share_1200x630.png";

const SITE_DESCRIPTION =
  "Losboi ek Hindi reading web app hai, jahan aap novels, thrillers aur chat-format kahaniyan padh sakte hain. Browser aur mobile, dono par.";

const SOCIAL_LINKS: string[] = [
  "https://www.youtube.com/@losboiofficial",
  "https://www.instagram.com/losboiofficial/",
  "https://www.facebook.com/losboiofficial",
  "https://www.pinterest.com/losboiofficial/",
  "https://x.com/losboiofficial",
  "https://www.quora.com/profile/Losboi",
  "https://www.reddit.com/user/losboiofficial",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Losboi - Hindi Reading Web App | Novels, Thrillers & Chat Stories",
    template: "%s | Losboi",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
  openGraph: {
    title: "Losboi - Hindi Reading Web App",
    description: "Hindi novels, thrillers aur chat-format kahaniyan, browser aur mobile par.",
    url: SITE_URL,
    siteName: "Losboi",
    locale: "hi_IN",
    type: "website",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "Losboi - Hindi Reading Web App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Losboi - Hindi Reading Web App",
    description: "Hindi novels, thrillers aur chat-format kahaniyan.",
    images: [OG_IMAGE_URL],
  },
  // Search Console verification: jab HTML tag wala code mil jaye, to neeche wali line uncomment karke code daalein.
  // verification: { google: "YAHAN_CODE" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Losboi",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: LOGO_URL },
        sameAs: SOCIAL_LINKS,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Losboi",
        url: SITE_URL,
        inLanguage: "hi",
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: "Losboi",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Any",
        inLanguage: "hi",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <html lang="hi">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}