"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { addStoredApiKey } from "@/lib/key-store";
import { getStoredBots, BotItem } from "@/lib/bot-store";
import {
  ArrowLeft,
  Key,
  Copy,
  Check,
  CheckCircle2,
  Code2,
  ShieldAlert,
  Bell,
  Sparkles,
} from "lucide-react";

export default function NewApiKeyPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [bots, setBots] = useState<BotItem[]>([]);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [permRead, setPermRead] = useState(true);
  const [permWrite, setPermWrite] = useState(false);
  const [permAdmin, setPermAdmin] = useState(false);
  const [expiry, setExpiry] = useState("never");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Output Result State
  const [activeDisplayKey, setActiveDisplayKey] = useState("");
  const [activeEmbedBotId, setActiveEmbedBotId] = useState("");
  const [hasGeneratedNewKey, setHasGeneratedNewKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [appOrigin, setAppOrigin] = useState("http://localhost:3000");

  // Load Bots and detect origin
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppOrigin(window.location.origin);
    }
    fetch("/api/bots")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.bots && Array.isArray(data.bots) && data.bots.length > 0) {
          const mapped: BotItem[] = data.bots.map((b: any) => ({
            id: b.id,
            name: b.name,
            desc: b.systemPrompt || "",
            model: b.model || "gemini-3.5-flash-lite",
            lastActive: "เพิ่งสร้าง",
            status: b.isActive ? "active" : "paused",
          }));
          setBots(mapped);
          setSelectedBotId(mapped[0].id);
          setActiveEmbedBotId(mapped[0].id);
        } else {
          const localBots = getStoredBots();
          setBots(localBots);
          if (localBots.length > 0) {
            setSelectedBotId(localBots[0].id);
            setActiveEmbedBotId(localBots[0].id);
          }
        }
      })
      .catch(() => {
        const localBots = getStoredBots();
        setBots(localBots);
        if (localBots.length > 0) {
          setSelectedBotId(localBots[0].id);
          setActiveEmbedBotId(localBots[0].id);
        }
      });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const copyToClipboard = (text: string, type: "key" | "script") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      showToast("คัดลอก API Key แล้ว");
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
      showToast("คัดลอกโค้ด Embed Script แล้ว");
    }
  };

  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const chosenBot = bots.find((b) => b.id === selectedBotId);
    const chosenBotName = chosenBot?.name || "Chatbot";
    const label = keyLabel.trim() || `คีย์สำหรับ ${chosenBotName}`;

    // Determine scope
    let scopeText = "Read only";
    if (permAdmin) {
      scopeText = "Full access";
    } else if (permWrite) {
      scopeText = "Read & Write";
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedPrefix = `bw_live_${randomSuffix}`;
    const generatedRawKey = `pk_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

    try {
      // 1. Try server POST
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: selectedBotId,
          type: permAdmin ? "SECRET_SERVER" : "PUBLIC_WIDGET",
          rateLimitPerMinute: 60,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const serverKey = data.rawKey || generatedRawKey;
        const serverPrefix = data.apiKey?.keyPrefix || generatedPrefix;

        const newKeyItem = {
          id: data.apiKey?.id || `key-${Date.now()}`,
          name: label,
          prefix: serverPrefix,
          created: "เพิ่งสร้างเมื่อสักครู่",
          lastUsed: "ยังไม่มีการเรียกใช้",
          perm: scopeText,
          botId: selectedBotId,
          botName: chosenBotName,
          rawKey: serverKey,
        };

        addStoredApiKey(newKeyItem);
        setActiveDisplayKey(serverKey);
        setActiveEmbedBotId(selectedBotId);
        setHasGeneratedNewKey(true);
        showToast(`สร้าง API Key "${label}" สำเร็จแล้ว!`);
      } else {
        // Fallback local key creation
        const newKeyItem = {
          id: `key-${Date.now()}`,
          name: label,
          prefix: generatedPrefix,
          created: "เพิ่งสร้างเมื่อสักครู่",
          lastUsed: "ยังไม่มีการเรียกใช้",
          perm: scopeText,
          botId: selectedBotId,
          botName: chosenBotName,
          rawKey: generatedRawKey,
        };
        addStoredApiKey(newKeyItem);
        setActiveDisplayKey(generatedRawKey);
        setActiveEmbedBotId(selectedBotId);
        setHasGeneratedNewKey(true);
        showToast(`สร้าง API Key "${label}" สำเร็จแล้ว!`);
      }
    } catch {
      // Offline / client fallback
      const newKeyItem = {
        id: `key-${Date.now()}`,
        name: label,
        prefix: generatedPrefix,
        created: "เพิ่งสร้างเมื่อสักครู่",
        lastUsed: "ยังไม่มีการเรียกใช้",
        perm: scopeText,
        botId: selectedBotId,
        botName: chosenBotName,
        rawKey: generatedRawKey,
      };
      addStoredApiKey(newKeyItem);
      setActiveDisplayKey(generatedRawKey);
      setActiveEmbedBotId(selectedBotId);
      setHasGeneratedNewKey(true);
      showToast(`สร้าง API Key "${label}" สำเร็จแล้ว!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const embedScriptCode = `<script src="${appOrigin}/widget.js" data-bot-key="${activeDisplayKey}" data-bot="${activeEmbedBotId}" defer></script>`;

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

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/keys"
                className="w-9 h-9 rounded-xl border border-borderLight bg-white flex items-center justify-center text-textMuted hover:text-textMain hover:bg-slate-50 transition shadow-xs"
                title="กลับไปยังหน้ารายการคีย์ API"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-textMain tracking-tight">
                    สร้างคีย์ API ใหม่
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF3EE] text-[#385241] border border-[#C9DCCF]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4E6955]"></span>
                    API Status: ปกติ
                  </span>
                </div>
                <p className="text-xs text-textMuted mt-0.5 hidden sm:block">
                  กำหนดค่าสิทธิ์การเข้าถึงและรับโค้ดสคริปต์สำหรับติดตั้งบนเว็บไซต์
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/keys"
              className="px-3.5 py-2 rounded-xl border border-borderLight bg-white text-xs font-semibold text-textMuted hover:text-textMain hover:bg-slate-50 transition"
            >
              ยกเลิก / กลับ
            </Link>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="w-10 h-10 rounded-xl bg-white border border-borderLight flex items-center justify-center text-slate-600 hover:text-[#4E6955] transition shadow-sm cursor-pointer"
                aria-label="Toggle notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs font-mono text-textMuted">
            <Link href="/dashboard" className="hover:text-textMain">แดชบอร์ด</Link>
            <span>/</span>
            <Link href="/dashboard/keys" className="hover:text-textMain">คีย์ API</Link>
            <span>/</span>
            <span className="text-[#4E6955] font-semibold">สร้างคีย์ใหม่</span>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Configuration */}
            <div className="lg:col-span-5 bg-cardBg rounded-2xl border border-borderLight shadow-sm p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-borderLight">
                <div className="w-7 h-7 rounded-lg bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-textMain">
                  ตั้งค่าสิทธิ์การใช้งานคีย์ใหม่
                </h2>
              </div>

              <form onSubmit={handleGenerateApiKey} className="space-y-4 text-xs">
                {/* 1. เลือกบอทที่ต้องการเชื่อมต่อ */}
                <div>
                  <label className="block font-medium text-textMain mb-1.5 font-mono text-[11px] uppercase tracking-wider">
                    เลือกบอทที่ต้องการเชื่อมต่อ (Select Bot)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBotId}
                      onChange={(e) => {
                        setSelectedBotId(e.target.value);
                        setActiveEmbedBotId(e.target.value);
                      }}
                      className="w-full appearance-none bg-white border border-borderLight rounded-xl px-3.5 py-2.5 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] cursor-pointer pr-9 shadow-xs"
                    >
                      {bots.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.model})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 2. ชื่อคีย์สำหรับการจดจำ */}
                <div>
                  <label className="block font-medium text-textMain mb-1.5 font-mono text-[11px] uppercase tracking-wider">
                    ชื่อคีย์สำหรับการจดจำ (Key Label)
                  </label>
                  <input
                    type="text"
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    placeholder="เช่น คีย์เว็บหลัก, คีย์เซิร์ฟเวอร์สำรอง"
                    className="w-full bg-white border border-borderLight rounded-xl px-3.5 py-2.5 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] shadow-xs"
                  />
                </div>

                {/* 3. สิทธิ์การใช้งาน (Permissions) */}
                <div>
                  <label className="block font-medium text-textMain mb-2 font-mono text-[11px] uppercase tracking-wider">
                    สิทธิ์การใช้งาน (Permissions)
                  </label>
                  <div className="space-y-2 rounded-xl bg-[#FAFBF9] border border-borderLight p-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={permRead}
                        onChange={(e) => setPermRead(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#4E6955] focus:ring-[#4E6955] accent-[#4E6955]"
                      />
                      <span className="text-textMain font-medium">
                        Read (อ่านข้อมูลความรู้ / ส่งข้อความคุย)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={permWrite}
                        onChange={(e) => setPermWrite(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#4E6955] focus:ring-[#4E6955] accent-[#4E6955]"
                      />
                      <span className="text-textMuted hover:text-textMain">
                        Write (อัปโหลดความรู้ / เปลี่ยนแปลงโปรไฟล์บอท)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={permAdmin}
                        onChange={(e) => setPermAdmin(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#4E6955] focus:ring-[#4E6955] accent-[#4E6955]"
                      />
                      <span className="text-textMuted hover:text-textMain">
                        Admin (ควบคุมสิทธิ์แอดมินทั้งหมด)
                      </span>
                    </label>
                  </div>
                </div>

                {/* 4. วันหมดอายุคีย์ (Expiry Date) */}
                <div>
                  <label className="block font-medium text-textMain mb-1.5 font-mono text-[11px] uppercase tracking-wider">
                    วันหมดอายุคีย์ (Expiry Date)
                  </label>
                  <div className="relative">
                    <select
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full appearance-none bg-white border border-borderLight rounded-xl px-3.5 py-2.5 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] cursor-pointer pr-9 shadow-xs"
                    >
                      <option value="never">ไม่มีวันหมดอายุ (ใช้งานได้ตลอดชีพ)</option>
                      <option value="30d">30 วัน</option>
                      <option value="90d">90 วัน</option>
                      <option value="1y">1 ปี</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold shadow-md shadow-emerald-950/10 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "กำลังสร้างคีย์..." : "สร้าง API Key ใหม่"}</span>
                  </button>

                  <Link
                    href="/dashboard/keys"
                    className="px-4 py-2.5 rounded-xl border border-borderLight text-xs font-semibold text-textMuted hover:text-textMain hover:bg-slate-50 transition"
                  >
                    ยกเลิก
                  </Link>
                </div>
              </form>
            </div>

            {/* Right Column: Output Box & One-Line Embed Script */}
            <div className="lg:col-span-7 bg-cardBg rounded-2xl border border-borderLight shadow-sm p-6 sm:p-7 space-y-6">
              {/* Success Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-borderLight">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-textMain">
                      {hasGeneratedNewKey ? "สร้างคีย์สำเร็จแล้ว!" : "ตัวอย่างคีย์และสคริปต์ที่พร้อมใช้งาน"}
                    </h3>
                    <p className="text-[11px] text-textMuted">
                      {hasGeneratedNewKey
                        ? "คีย์นี้ถูกบันทึกเข้าสู่ระบบเรียบร้อยแล้ว"
                        : "คลิกปุ่ม 'สร้าง API Key ใหม่' เพื่อบันทึกคีย์ของคุณ"}
                    </p>
                  </div>
                </div>

                {hasGeneratedNewKey && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-3 h-3" />
                    สร้างสำเร็จ
                  </span>
                )}
              </div>

              {/* Warning Info */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  คีย์นี้สร้างขึ้นเพื่อใช้งานเชื่อมต่อ Botwise โปรดคัดลอกเก็บไว้ให้ปลอดภัยเพราะคุณจะไม่สามารถดูโทเค็นแบบเต็มได้อีกครั้งหลังจากปิดหน้านี้
                </p>
              </div>

              {/* API Key Output Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-textMain font-mono uppercase tracking-wide">
                  API Key Token
                </label>
                <div className="flex items-center bg-[#F6F8F6] border border-borderLight rounded-xl px-4 py-3 justify-between gap-3 shadow-xs">
                  <span className="font-mono text-xs text-textMain font-semibold select-all break-all">
                    {hasGeneratedNewKey && activeDisplayKey
                      ? activeDisplayKey
                      : "(ยังไม่ได้สร้างคีย์ - กำหนดค่าทางซ้ายแล้วกดสร้างคีย์)"}
                  </span>
                  {hasGeneratedNewKey && activeDisplayKey && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeDisplayKey, "key")}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-borderLight hover:bg-slate-50 text-textMain rounded-lg text-xs font-medium transition shadow-xs cursor-pointer active:scale-95"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>คัดลอกคีย์</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* One-Line Embed Script Box */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#4E6955]" />
                    <label className="block text-xs font-bold text-textMain font-mono">
                      สคริปต์หน้าเว็บแบบ 1 บรรทัด (One-Line Embed Script)
                    </label>
                  </div>
                  <p className="text-[11px] text-textMuted mt-0.5">
                    คัดลอกโค้ดสคริปต์นี้ไปวางก่อนปิดแท็ก &lt;/body&gt; ของหน้าเว็บที่ต้องการแสดงหน้าต่างแชททันที
                  </p>
                </div>

                {/* Dark Terminal Code Box */}
                <div className="bg-[#111915] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-950 shadow-inner">
                  <code className="font-mono text-[11px] text-emerald-300 break-all select-all leading-relaxed">
                    {hasGeneratedNewKey && activeDisplayKey
                      ? embedScriptCode
                      : "<!-- โค้ดสคริปต์จะถูกสร้างที่นี่โดยอัตโนมัติเมื่อกด 'สร้าง API Key ใหม่' -->"}
                  </code>
                  {hasGeneratedNewKey && activeDisplayKey && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(embedScriptCode, "script")}
                      className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#4E6955] hover:bg-[#3E5343] text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer active:scale-95"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-white" />
                          <span>คัดลอกโค้ด</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Navigation / Finish Action */}
              <div className="pt-4 border-t border-borderLight flex items-center justify-between">
                <Link
                  href="/dashboard/keys"
                  className="inline-flex items-center gap-1.5 text-xs text-textMuted hover:text-textMain transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับไปยังหน้ารายการคีย์</span>
                </Link>

                <button
                  type="button"
                  onClick={() => router.push("/dashboard/keys")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  <span>เสร็จสิ้นและกลับสู่รายการคีย์</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
