"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<{
    email: string;
    creditBalance: number;
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const isBotsActive = pathname.startsWith("/dashboard/bots");
  const isDashboardActive = pathname === "/dashboard";
  const isKeysActive = pathname.startsWith("/dashboard/keys") || pathname.startsWith("/dashboard/api-keys");
  const isLogsActive = pathname.startsWith("/dashboard/analytics");

  const displayName = currentUser ? currentUser.email.split("@")[0] : "Admin Workspace";
  const avatarLetter = displayName.charAt(0).toUpperCase();

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
        className={`w-64 bg-sidebar text-emerald-100 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-200 select-none border-r border-sidebarBorder ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="h-20 flex items-center px-5 gap-3 border-b border-sidebarBorder">
            <div className="w-9 h-9 rounded-xl bg-brandGreen flex items-center justify-center text-white shadow-md shadow-emerald-950/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                AI Charming
                <span className="text-[10px] bg-sidebarActive text-emerald-300 font-mono px-1.5 py-0.5 rounded uppercase">
                  Bot
                </span>
              </span>
              <span className="text-[11px] text-emerald-200/60 font-medium">WORKSPACE</span>
            </div>
          </div>

          {/* Nav List */}
          <div className="p-3">
            <div className="px-3 pb-2 pt-2 text-[10px] font-semibold text-emerald-300/40 uppercase tracking-wider font-mono">
              เมนูหลัก
            </div>
            <nav className="space-y-1">
              {/* 1. แดชบอร์ด */}
              <Link
                href="/dashboard"
                onClick={onCloseMobile}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors ${
                  isDashboardActive
                    ? "text-white bg-sidebarActive shadow-sm"
                    : "text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
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
                    ? "text-white bg-sidebarActive shadow-sm"
                    : "text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
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
                    ? "text-white bg-sidebarActive shadow-sm"
                    : "text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
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
                href="/dashboard/analytics"
                onClick={onCloseMobile}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors ${
                  isLogsActive
                    ? "text-white bg-sidebarActive shadow-sm"
                    : "text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
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
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
              >
                <svg
                  className="w-4 h-4 shrink-0"
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
        <div className="p-3 border-t border-emerald-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-sidebarHover/80 transition">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-white text-sidebar font-semibold text-xs flex items-center justify-center shadow shrink-0">
                {avatarLetter}
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-white text-xs font-semibold leading-tight truncate">
                  {currentUser ? currentUser.email : "เข้าสู่ระบบ"}
                </span>
                <span className="text-[11px] text-emerald-200/70 leading-tight">
                  {currentUser ? `${currentUser.creditBalance} เครดิต` : "Guest"}
                </span>
              </div>
            </div>
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                title="ออกจากระบบ"
                className="text-emerald-200/60 hover:text-rose-300 p-1.5 rounded-md transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            ) : (
              <Link
                href="/login"
                title="เข้าสู่ระบบ"
                className="text-emerald-200/60 hover:text-white p-1.5 rounded-md transition"
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
