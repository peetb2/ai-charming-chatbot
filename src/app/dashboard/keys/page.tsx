"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  getStoredApiKeys,
  removeStoredApiKey,
  ApiKeyItem,
} from "@/lib/key-store";
import {
  ShieldAlert,
  Key,
  Copy,
  Check,
  Trash2,
  Bell,
  AlertTriangle,
  Info,
  ExternalLink,
  Plus,
} from "lucide-react";

export default function ApiKeysPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [revokeModalKey, setRevokeModalKey] = useState<ApiKeyItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load keys from server API or local store
  useEffect(() => {
    fetch("/api/keys")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.apiKeys && Array.isArray(data.apiKeys)) {
          const mapped: ApiKeyItem[] = data.apiKeys.map((k: any) => ({
            id: k.id,
            name: k.botName ? `คีย์สำหรับ ${k.botName}` : "API Key",
            prefix: k.keyPrefix,
            created: k.createdAt
              ? new Date(k.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "เพิ่งสร้าง",
            lastUsed: "พร้อมใช้งาน",
            perm: k.type === "PUBLIC_WIDGET" ? "Read only" : "Full access",
          }));
          setApiKeys(mapped);
        } else {
          setApiKeys(getStoredApiKeys());
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setApiKeys(getStoredApiKeys());
        setIsLoaded(true);
      });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const copyToClipboard = (text: string, label: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    showToast(`คัดลอก ${label} แล้ว`);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeModalKey) return;
    const targetId = revokeModalKey.id;
    const targetName = revokeModalKey.name;

    // Optimistically update
    const updated = removeStoredApiKey(targetId);
    setApiKeys((prev) => prev.filter((k) => k.id !== targetId));
    setRevokeModalKey(null);
    showToast(`เพิกถอนคีย์ "${targetName}" เรียบร้อยแล้ว`);

    // Call server DELETE
    try {
      await fetch(`/api/keys?id=${targetId}`, { method: "DELETE" });
    } catch {
      // Handled via local storage
    }
  };

  return (
    <div className="bg-appBg text-textMain min-h-screen flex antialiased selection:bg-[#76937F] selection:text-white font-sans w-full topo-bg-warm">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A231E] text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-700 text-xs flex items-center gap-2.5 animate-bounce font-mono">
          <span className="w-2 h-2 rounded-full bg-[#76937F]"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Deep Sage Green Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col overflow-y-auto">
        {/* Top App Bar Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between sticky top-0 z-20 border-b border-borderLight/90">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-200/60 lg:hidden"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-textMain tracking-tight">
                  คีย์ API
                </h1>
                {/* Status Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF3EE] text-[#385241] border border-[#C9DCCF]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4E6955] animate-pulse"></span>
                  API Status: ปกติ
                </span>
              </div>
              <p className="text-xs text-textMuted mt-0.5 hidden sm:block">
                จัดการ credentials สำหรับเชื่อมต่อ Botwise API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary Action Button: + สร้างคีย์ใหม่ */}
            <Link
              href="/dashboard/keys/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ สร้างคีย์ใหม่</span>
            </Link>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="w-10 h-10 rounded-xl bg-white border border-borderLight flex items-center justify-center text-slate-600 hover:text-[#4E6955] hover:border-[#4E6955]/40 transition shadow-sm cursor-pointer relative"
                aria-label="Toggle notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#4E6955] rounded-full ring-2 ring-white"></span>
              </button>

              {/* Notification Popover */}
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-borderLight p-4 z-50 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-borderLight">
                    <span className="font-bold text-sm text-textMain">การแจ้งเตือนระบบ</span>
                    <button
                      type="button"
                      onClick={() => {
                        showToast("ทำเครื่องหมายว่าอ่านแล้ว");
                        setNotificationOpen(false);
                      }}
                      className="text-[11px] text-[#4E6955] font-medium cursor-pointer hover:underline"
                    >
                      อ่านทั้งหมด
                    </button>
                  </div>
                  <div className="py-6 text-center text-xs text-textMuted">
                    <p className="font-medium text-textMain">ไม่มีการแจ้งเตือนค้างอยู่</p>
                    <p className="text-[11px] text-textMuted mt-0.5">ระบบ Botwise API และกุญแจเชื่อมต่อทำงานปกติ</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body Container */}
        <div className="p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Security Info Banner */}
          <div className="bg-[#FAFBF9] border border-[#D5DFD8] rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-textMain">
                  เก็บ API key ให้ปลอดภัย คีย์แบบเต็มจะแสดงเพียงครั้งเดียวเมื่อสร้าง
                </p>
                <p className="text-[11px] text-textMuted mt-0.5 hidden md:block">
                  ห้ามเปิดเผยคีย์ลับในโค้ดฝั่ง Client-side หรือแชร์บน Public Repository
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSecurityModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4E6955] hover:text-[#385241] hover:underline shrink-0 cursor-pointer self-start sm:self-center"
            >
              <span>อ่านคู่มือความปลอดภัย</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* API Keys Table Card */}
          <div className="bg-cardBg rounded-2xl border border-borderLight shadow-sm overflow-hidden">
            {/* Table Card Header */}
            <div className="p-5 sm:px-6 border-b border-borderLight flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-sm sm:text-base text-textMain">
                  คีย์ทั้งหมด
                </h2>
              </div>
              <span className="text-xs text-textMuted font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-borderLight">
                {apiKeys.length} คีย์ที่ใช้งาน
              </span>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFBF9] border-b border-borderLight text-textMuted uppercase font-semibold text-[11px] tracking-wider font-mono">
                  <tr>
                    <th className="py-3.5 px-6">ชื่อ</th>
                    <th className="py-3.5 px-6">PREFIX</th>
                    <th className="py-3.5 px-6">วันที่สร้าง</th>
                    <th className="py-3.5 px-6">ใช้งานล่าสุด</th>
                    <th className="py-3.5 px-6">สิทธิ์</th>
                    <th className="py-3.5 px-6 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLight">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-textMuted">
                        <Key className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium">ยังไม่มีคีย์ API ในระบบ</p>
                        <p className="text-[11px] mt-1">คลิกปุ่ม &quot;+ สร้างคีย์ใหม่&quot; ด้านบนเพื่อเริ่มต้นเชื่อมต่อบอท</p>
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        {/* 1. Name */}
                        <td className="py-4 px-6 font-semibold text-textMain">
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            {item.botName && (
                              <span className="text-[11px] text-textMuted font-normal mt-0.5">
                                บอท: {item.botName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. PREFIX */}
                        <td className="py-4 px-6 font-mono text-slate-800">
                          <div className="inline-flex items-center gap-2 bg-[#F6F8F6] px-2.5 py-1 rounded-md border border-borderLight">
                            <span>{item.prefix}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.prefix, "Prefix", item.id)}
                              className="text-slate-400 hover:text-[#4E6955] transition cursor-pointer p-0.5"
                              title="คัดลอก prefix"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 3. Created Date */}
                        <td className="py-4 px-6 text-textMuted font-mono">
                          {item.created}
                        </td>

                        {/* 4. Last Used */}
                        <td className="py-4 px-6 text-textMuted">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {item.lastUsed}
                          </span>
                        </td>

                        {/* 5. Scope Pill */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono ${
                              item.perm.toLowerCase().includes("full")
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.perm.toLowerCase().includes("full")
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                              }`}
                            ></span>
                            {item.perm}
                          </span>
                        </td>

                        {/* 6. ACTION (Copy icon & Revoke button) */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.prefix, "API Key Prefix")}
                              className="text-slate-400 hover:text-textMain transition p-1 cursor-pointer"
                              title="คัดลอกคีย์"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRevokeModalKey(item)}
                              className="text-rose-600 hover:text-rose-700 font-semibold text-xs transition cursor-pointer hover:underline"
                            >
                              เพิกถอน
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 sm:px-6 bg-[#FAFBF9] border-t border-borderLight flex items-center justify-between text-xs text-textMuted">
              <span className="text-[11px] sm:text-xs">
                แสดงผลทั้งหมด {apiKeys.length} รายการ
              </span>
              <span className="text-[11px] text-textMuted font-mono">
                API Rate limit: 60 req/min
              </span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="flex items-center justify-center gap-2 text-textMuted text-xs pt-1 pb-4">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p className="text-center">
              คีย์ที่ไม่ถูกใช้งานเกิน 90 วันควรถูกเพิกถอนเพื่อลดความเสี่ยง
            </p>
          </div>
        </div>
      </main>

      {/* Revocation Confirmation Modal */}
      {revokeModalKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-borderLight space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-textMain">
                ยืนยันการเพิกถอนคีย์ API?
              </h3>
              <p className="text-xs text-textMuted mt-1.5 leading-relaxed">
                คุณกำลังจะเพิกถอนคีย์ &quot;<strong className="text-textMain">{revokeModalKey.name}</strong>&quot; ({revokeModalKey.prefix})
                คำขอบริการที่ใช้คีย์นี้หลังจากนี้จะถูกปฏิเสธทันที
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderLight">
              <button
                type="button"
                onClick={() => setRevokeModalKey(null)}
                className="px-4 py-2 rounded-xl border border-borderLight text-xs font-semibold text-textMain hover:bg-slate-50 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                ยืนยันการเพิกถอน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Guide Modal */}
      {securityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-borderLight space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-borderLight">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-textMain">
                  คู่มือความปลอดภัยสำหรับ API Keys
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-textMain leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-[#385241] mb-1">1. คีย์แบบเต็มจะแสดงเพียงครั้งเดียว</h4>
                <p className="text-textMuted">
                  เมื่อคุณสร้างคีย์ API ระบบจะแสดงรหัสแบบสมบูรณ์เพียงครั้งเดียว โปรดบันทึกลงใน Environment Variable (.env) หรือ Password Manager ที่ปลอดภัยทันที
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-[#385241] mb-1">2. การจำกัดสิทธิ์ (Principle of Least Privilege)</h4>
                <p className="text-textMuted">
                  สำหรับวิดเจ็ตหน้าบ้าน (Web Widget) ให้ใช้สิทธิ์ &quot;Read only&quot; เสมอ และเก็บคีย์ &quot;Full access&quot; ไว้สำหรับเซิร์ฟเวอร์ Backend เท่านั้น
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-[#385241] mb-1">3. การเพิกถอนคีย์ที่ไม่ได้ใช้งาน</h4>
                <p className="text-textMuted">
                  คีย์ที่ไม่มีการเคลื่อนไหวเกิน 90 วัน หรือคีย์ของทีมงานที่พ้นสภาพ ควรถูกเพิกถอนทันทีเพื่อลดความเสี่ยง
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-borderLight flex justify-end">
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold transition cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
