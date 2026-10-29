"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, User, Gift } from "lucide-react";

/* Jin routes par bottom nav chhupana hai, yahan add karte jao */
const HIDE_NAV_ROUTES = ["/read"];

function shouldHideNav(pathname: string | null): boolean {
  if (!pathname) return false;
  // "/read" aur "/read/..." match honge, par "/reading-list" jaise route nahi
  return HIDE_NAV_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function navColor(active: boolean, hover: string): string {
  return active ? "text-blue-600" : `text-gray-500 ${hover}`;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = shouldHideNav(pathname);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !!pathname && pathname.startsWith(href);

  return (
    <>
      {/* Main content: nav chhupa ho to niche ki extra padding bhi hat jati hai */}
      <div
        className={`max-w-md mx-auto min-h-screen bg-white shadow-sm ${
          hideNav ? "" : "pb-20"
        }`}
      >
        {children}
      </div>

      {/* Bottom navigation: reading page par poori tarah hata di jati hai */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center">
            
            {/* Added 'replace' to fix navigation history loop */}
            <Link
              href="/"
              replace
              className={`flex flex-col items-center transition ${navColor(
                isActive("/"),
                "hover:text-blue-600"
              )}`}
            >
              <Home size={24} />
              <span className="text-[10px] mt-1 font-medium">Home</span>
            </Link>

            <Link
              href="/explore"
              replace
              className={`flex flex-col items-center transition ${navColor(
                isActive("/explore"),
                "hover:text-blue-600"
              )}`}
            >
              <Compass size={24} />
              <span className="text-[10px] mt-1 font-medium">Explore</span>
            </Link>

            <Link
              href="/waitlist"
              replace
              className={`flex flex-col items-center transition relative ${navColor(
                isActive("/waitlist"),
                "hover:text-amber-500"
              )}`}
            >
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              <Gift size={24} />
              <span className="text-[10px] mt-1 font-medium">Rewards</span>
            </Link>

            {/* Added 'replace' to fix navigation history loop */}
            <Link
              href="/profile"
              replace
              className={`flex flex-col items-center transition ${navColor(
                isActive("/profile"),
                "hover:text-blue-600"
              )}`}
            >
              <User size={24} />
              <span className="text-[10px] mt-1 font-medium">Profile</span>
            </Link>

          </div>
        </nav>
      )}
    </>
  );
}
