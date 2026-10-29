"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { logoutUser, getCachedUser, fetchCurrentUser, UserSessionData } from "@/lib/client-auth";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarNavContent({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [currentUser, setCurrentUser] = React.useState<UserSessionData | null>(() => getCachedUser());

  React.useEffect(() => {
    // Initial fetch to sync real user state
    fetchCurrentUser().then((user) => {
      if (user) setCurrentUser(user);
    });

    const handleAuthChange = () => {
      setCurrentUser(getCachedUser());
    };

    window.addEventListener("matcha_auth_change", handleAuthChange);
    return () => {
      window.removeEventListener("matcha_auth_change", handleAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const isBotsActive = pathname.startsWith("/dashboard/bots");
  const isKeysActive = pathname.startsWith("/dashboard/keys") || pathname.startsWith("/dashboard/api-keys");
  const isLogsActive = pathname.startsWith("/dashboard/analytics") || (pathname === "/dashboard" && tabParam === "logs");
  const isBillingActive = pathname === "/dashboard" && tabParam === "billing";
  const isDashboardActive = pathname === "/dashboard" && !isLogsActive && !isBillingActive;

  const avatarLetter = (currentUser?.email ? currentUser.email.charAt(0) : "A").toUpperCase();
  const creditDisplay = currentUser ? `${currentUser.creditBalance ?? 0} เครดิต` : "91 เครดิต";

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`w-64 bg-[#27382B] text-emerald-100 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-200 select-none border-r border-[#1F2C22] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="h-20 flex items-center px-5 gap-3 border-b border-[#1F2C22]">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-100 shadow-inner group hover:scale-105 transition-transform"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L14.2 8.2L20.4 10.4L14.2 12.6L12 18.8L9.8 12.6L3.6 10.4L9.8 8.2L12 2Z" />
                <path
                  d="M19 16L20.1 19.1L23.2 20.2L20.1 21.3L19 24.4L17.9 21.3L14.8 20.2L17.9 19.1L19 16Z"
                  opacity="0.85"
                />
              </svg>
            </Link>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-[15px] tracking-tight">
                AI Charming Chat Bot
              </span>
            </div>
          </div>

          {/* Nav List */}
          <div className="px-3 pt-6">
            <div className="px-3 pb-2 text-[11px] font-semibold text-[#A3B8A8]/60 tracking-wider uppercase font-mono">
              WORKSPACE
            </div>
            <nav className="space-y-1.5">
              {/* 1. แดชบอร์ด */}
              <Link
                href="/dashboard"
                onClick={onCloseMobile}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors ${
                  isDashboardActive
                    ? "text-white bg-[#435548] shadow-sm"
                    : "text-[#A3B8A8] hover:text-white hover:bg-[#344638]"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    isDashboardActive ? "text-emerald-200" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                </svg>
                <span>แดชบอร์ด</span>
              </Link>

              {/* 2. จัดการบอท */}
              <Link
                href="/dashboard/bots"
                onClick={onCloseMobile}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors ${
                  isBotsActive
                    ? "text-white bg-[#435548] shadow-sm"
                    : "text-[#A3B8A8] hover:text-white hover:bg-[#344638]"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    isBotsActive ? "text-emerald-200" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="4" y="8" width="16" height="12" rx="2" strokeWidth="2" />
                  <circle cx="9" cy="13" r="1.25" fill="currentColor" />
                  <circle cx="15" cy="13" r="1.25" fill="currentColor" />
                  <path d="M12 4v4" strokeWidth="2" strokeLinecap="round" />
                  <path d="M2 13h2m16 0h2" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>จัดการบอท</span>
              </Link>

              {/* 3. คีย์ API */}
              <Link
                href="/dashboard/keys"
                onClick={onCloseMobile}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors ${
                  isKeysActive
                    ? "text-white bg-[#435548] shadow-sm"
                    : "text-[#A3B8A8] hover:text-white hover:bg-[#344638]"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    isKeysActive ? "text-emerald-200" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="8" cy="8" r="4" strokeWidth="2" />
                  <path
                    d="M10.8 10.8L18 18m-2-2l2 2m0-3l2 2"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>คีย์ API</span>
              </Link>

              {/* 4. ประวัติการใช้งาน */}
              <Link
                href="/dashboard?tab=logs"
                onClick={onCloseMobile}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors ${
                  isLogsActive
                    ? "text-white bg-[#435548] shadow-sm"
                    : "text-[#A3B8A8] hover:text-white hover:bg-[#344638]"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    isLogsActive ? "text-emerald-200" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12h6m-6 4h4m-7 4h12a2 2 0 002-2V6a2 2 0 00-2-2H8l-4 4v12a2 2 0 002 2z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>ประวัติการใช้งาน</span>
              </Link>

              {/* 5. การชำระเงิน */}
              <Link
                href="/dashboard?tab=billing"
                onClick={onCloseMobile}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors ${
                  isBillingActive
                    ? "text-white bg-[#435548] shadow-sm"
                    : "text-[#A3B8A8] hover:text-white hover:bg-[#344638]"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    isBillingActive ? "text-emerald-200" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
                  <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2" />
                </svg>
                <span>การชำระเงิน</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* User Profile Footer Area */}
        <div className="p-3 border-t border-[#1F2C22]">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#344638]/50 transition">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-white text-[#27382B] font-bold text-xs flex items-center justify-center shadow shrink-0">
                {avatarLetter}
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-white text-xs font-semibold leading-tight truncate">
                  {currentUser ? currentUser.email : "เข้าสู่ระบบ"}
                </span>
                <span className="text-[11px] text-[#A3B8A8] leading-tight">
                  {creditDisplay}
                </span>
              </div>
            </div>
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                title="ออกจากระบบ"
                className="text-[#A3B8A8] hover:text-rose-300 p-1.5 rounded-md transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            ) : (
              <Link
                href="/login"
                title="เข้าสู่ระบบ"
                className="text-[#A3B8A8] hover:text-white p-1.5 rounded-md transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarNavContent {...props} />
    </Suspense>
  );
}
