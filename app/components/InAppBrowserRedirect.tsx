"use client";
import { useEffect, useState } from "react";

// Instagram, Facebook, Messenger, Snapchat, LinkedIn, Twitter, WeChat, Line ke in-app browsers
const IN_APP_REGEX = /Instagram|FBAN|FBAV|FB_IAB|Messenger|Snapchat|LinkedInApp|Twitter|MicroMessenger|Line\//i;

export default function InAppBrowserRedirect() {
  const [showBanner, setShowBanner] = useState(false);
  const [cleanUrl, setCleanUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isInApp = IN_APP_REGEX.test(ua);
    const isAndroid = /Android/i.test(ua);

    // Abhi sirf Android (iPhone baad mein)
    if (!isInApp || !isAndroid) return;

    const current = new URL(window.location.href);
    const tried = current.searchParams.get("ob") === "1";

    // Saaf link (ob param ke bina)
    const clean = new URL(current.href);
    clean.searchParams.delete("ob");
    setCleanUrl(clean.href);

    // Ek baar try ho chuka hai (Chrome nahi mila / Instagram ne roka) -> loop nahi, banner dikhao
    if (tried) {
      setShowBanner(true);
      return;
    }

    // Pehli koshish: seedha Chrome mein kholo. Fail hua toh ob=1 ke saath wapas aayega.
    const fallback = new URL(clean.href);
    fallback.searchParams.set("ob", "1");
    const target = `${clean.host}${clean.pathname}${clean.search}`;
    window.location.replace(
      `intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallback.href)};end;`
    );
  }, []);

  const openInBrowser = () => {
    const u = new URL(cleanUrl);
    // Package nahi diya, isliye phone ka default browser (ya chooser) khulega
    window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;end;`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Link copy nahi hua. Upar ⋮ menu se 'Open in browser' chunein.");
    }
  };

  if (!showBanner) return null;

  return (
    <div className="bg-black text-white px-4 py-2.5 flex items-center justify-between gap-2 text-xs sticky top-0 z-[100] shadow-md font-sans">
      <span className="flex-1 leading-snug">Instagram browser mein login mein problem aa rahi hai?</span>
      <button
        onClick={openInBrowser}
        className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg active:scale-95 transition whitespace-nowrap"
      >
        Browser mein kholein
      </button>
      <button
        onClick={copyLink}
        className="border border-white/30 text-white font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition whitespace-nowrap"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
