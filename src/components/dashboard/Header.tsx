"use client";

import React, { useState, useEffect } from "react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onOpenMobileSidebar: () => void;
  actionButton?: React.ReactNode;
}

export default function Header({
  title,
  subtitle,
  onOpenMobileSidebar,
  actionButton,
}: HeaderProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [logsData, setLogsData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.logs && Array.isArray(data.logs)) {
          const mappedLogs = data.logs.map((l: any) => ({
            id: l.id ? String(l.id).slice(0, 10) : "req_live",
            bot: l.bot?.name || "Chatbot",
            endpoint: "POST /v1/widget/chat",
            status: 200,
            latency: `${Math.floor(200 + Math.random() * 200)} ms`,
            time: l.createdAt
              ? new Date(l.createdAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "เมื่อสักครู่",
          }));
          setLogsData(mappedLogs);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="h-20 bg-white/75 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between sticky top-0 z-20 border-b border-borderLight/90">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-200/60 lg:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-textMain tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-textMuted mt-0.5 hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Optional Action Button */}
        {actionButton}

        {/* API Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>API Status: ปกติ</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="w-10 h-10 rounded-xl bg-white border border-borderLight flex items-center justify-center text-slate-600 hover:text-brandGreen hover:border-brandGreen/40 transition shadow-sm cursor-pointer relative"
            aria-label="Toggle notifications"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {logsData.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {/* Notification Popover */}
          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-borderLight p-4 z-50 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-borderLight">
                <span className="font-bold text-sm text-textMain">การแจ้งเตือน</span>
                <button
                  type="button"
                  onClick={() => setNotificationOpen(false)}
                  className="text-[11px] text-brandGreen font-medium cursor-pointer hover:underline"
                >
                  อ่านทั้งหมด
                </button>
              </div>
              <div className="divide-y divide-borderLight/60 max-h-60 overflow-y-auto pt-1">
                {logsData.length > 0 ? (
                  logsData.slice(0, 4).map((log) => (
                    <div key={log.id} className="py-2.5 text-xs">
                      <p className="font-medium text-textMain">
                        {log.bot} ได้รับคำขอ ({log.endpoint})
                      </p>
                      <p className="text-[11px] text-textMuted mt-0.5">
                        {log.time} • สถานะ {log.status}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-5 text-center text-xs text-textMuted">
                    ไม่มีการแจ้งเตือนใหม่ในขณะนี้
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
