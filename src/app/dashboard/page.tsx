"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TabType = "dashboard" | "bots" | "apikeys" | "logs" | "billing";
type BotSubViewType = "form" | "list";
type ApiSubViewType = "create" | "list";

interface UploadedFile {
  name: string;
  size: string;
}

interface BotItem {
  id: string;
  name: string;
  desc: string;
  model: string;
  lastActive: string;
  status: "active" | "paused";
}

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  bot: string;
  created: string;
  lastUsed: string;
  perm: string;
}

interface LogItem {
  id: string;
  bot: string;
  endpoint: string;
  status: number;
  latency: string;
  time: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<TabType>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Subview states for the 2 new dedicated management views
  const [botSubView, setBotSubView] = useState<BotSubViewType>("form");
  const [apiSubView, setApiSubView] = useState<ApiSubViewType>("create");

  const [userCredits, setUserCredits] = useState<number>(100);
  const [totalApiRequests, setTotalApiRequests] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    creditBalance: number;
  } | null>(null);
  const [dailyUsageStats, setDailyUsageStats] = useState<
    { date: string; total: number; success: number }[]
  >([]);
  const [appOrigin, setAppOrigin] = useState("http://localhost:3000");

  // Sync tab from URL query params and load real database records
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppOrigin(window.location.origin);
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as TabType;
      if (tabParam === "bots") {
        window.location.replace("/dashboard/bots");
        return;
      }
      if (tabParam === "apikeys") {
        window.location.replace("/dashboard/keys");
        return;
      }
      if (
        tabParam &&
        ["dashboard", "logs", "billing"].includes(tabParam)
      ) {
        setCurrentTab(tabParam);
      }
    }

    // Fetch authenticated user
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser(data.user);
          if (typeof data.user.creditBalance === "number") {
            setUserCredits(data.user.creditBalance);
          }
        }
      })
      .catch(() => {});

    // 1. Fetch real bots from DB
    fetch("/api/bots")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.bots && Array.isArray(data.bots)) {
          const mapped: BotItem[] = data.bots.map((b: any) => ({
            id: b.id,
            name: b.name,
            desc: b.systemPrompt ? b.systemPrompt.slice(0, 90) : "บอทผู้ช่วย AI สำหรับตอบคำถาม",
            model: b.model || "gemini-1.5-flash",
            lastActive: b.createdAt
              ? `สร้างเมื่อ ${new Date(b.createdAt).toLocaleDateString("th-TH")}`
              : "เพิ่งสร้าง",
            status: b.isActive ? "active" : "paused",
          }));
          setBotsData(mapped);
          if (mapped.length > 0) {
            setSelectedBotId(mapped[0].id);
            setActiveEmbedBotId(mapped[0].id);
          }
        }
      })
      .catch(() => {});

    // 2. Fetch real keys from DB
    fetch("/api/keys")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.apiKeys && Array.isArray(data.apiKeys)) {
          const mappedKeys: ApiKeyItem[] = data.apiKeys.map((k: any) => ({
            id: k.id,
            name: `คีย์สำหรับ ${k.botName || "แชทบอท"}`,
            prefix: k.keyPrefix,
            bot: k.botName || "บอท",
            created: new Date(k.createdAt).toLocaleDateString("th-TH"),
            lastUsed: "ล่าสุด",
            perm: k.type === "PUBLIC_WIDGET" ? "Public Widget" : "Server Secret",
          }));
          setApiKeysData(mappedKeys);
        }
      })
      .catch(() => {});

    // 3. Fetch real analytics & usage logs from DB
    fetch("/api/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (typeof data.creditBalance === "number") {
            setUserCredits(data.creditBalance);
          }
          if (typeof data.totalMessages === "number") {
            setTotalApiRequests(data.totalMessages);
          }
          if (data.dailyStats && Array.isArray(data.dailyStats)) {
            setDailyUsageStats(data.dailyStats);
          }
          if (data.logs && Array.isArray(data.logs)) {
            const mappedLogs: LogItem[] = data.logs.map((l: any) => ({
              id: l.id ? l.id.slice(0, 10) : "req_live",
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
        }
      })
      .catch(() => {});
  }, []);

  const switchTab = (tab: TabType) => {
    if (tab === "bots") {
      router.push("/dashboard/bots");
      return;
    }
    if (tab === "apikeys") {
      router.push("/dashboard/keys");
      return;
    }
    setCurrentTab(tab);
    setMobileSidebarOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Notification Popover State
  const [notificationOpen, setNotificationOpen] = useState(false);

  // ========================================================
  // BOTS STATE & KNOWLEDGE BASE
  // ========================================================
  const [botsData, setBotsData] = useState<BotItem[]>([]);

  // Bot creation form state
  const [formBotName, setFormBotName] = useState("");
  const [formBotDesc, setFormBotDesc] = useState("");
  const [formBotModel, setFormBotModel] = useState("gemini-1.5-flash");
  const [formBotTone, setFormBotTone] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bot list search & filter
  const [botSearch, setBotSearch] = useState("");
  const [botStatusFilter, setBotStatusFilter] = useState("all");
  const [botModelFilter, setBotModelFilter] = useState("all");

  const filteredBots = useMemo(() => {
    return botsData.filter((bot) => {
      const matchSearch =
        bot.name.toLowerCase().includes(botSearch.toLowerCase()) ||
        bot.desc.toLowerCase().includes(botSearch.toLowerCase());
      const matchStatus =
        botStatusFilter === "all" || bot.status === botStatusFilter;
      const matchModel =
        botModelFilter === "all" || bot.model.includes(botModelFilter);
      return matchSearch && matchStatus && matchModel;
    });
  }, [botsData, botSearch, botStatusFilter, botModelFilter]);

  const handleCreateBotFull = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBotName.trim()) return;

    const newBot: BotItem = {
      id: "bot-" + Math.floor(100 + Math.random() * 900),
      name: formBotName.trim(),
      desc: formBotDesc.trim() || "บอทผู้ช่วยอัจฉริยะ",
      model: formBotModel,
      lastActive: "เพิ่งสร้างเมื่อสักครู่",
      status: "active",
    };

    setBotsData([newBot, ...botsData]);
    setBotSubView("list");
    showToast(`สร้างบอท "${newBot.name}" สำเร็จแล้ว!`);
  };

  const resetBotForm = () => {
    setFormBotName("");
    setFormBotDesc("");
    setFormBotTone("");
    showToast("ล้างข้อมูลฟอร์มแล้ว");
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    showToast("ลบไฟล์ออกจากฐานความรู้แล้ว");
  };

  const handleAddFiles = (files: FileList | File[]) => {
    const newItems: UploadedFile[] = Array.from(files).map((f) => ({
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1) + " MB",
    }));
    setUploadedFiles((prev) => [...prev, ...newItems]);
    showToast(`อัปโหลด ${newItems.length} ไฟล์เข้าสู่ฐานความรู้เรียบร้อย`);
  };

  // ========================================================
  // API KEYS STATE & CODE SNIPPET
  // ========================================================
  const [apiKeysData, setApiKeysData] = useState<ApiKeyItem[]>([]);

  const [selectedBotId, setSelectedBotId] = useState("");
  const [keyLabelInput, setKeyLabelInput] = useState("");
  const [permRead, setPermRead] = useState(true);
  const [permWrite, setPermWrite] = useState(false);
  const [permAdmin, setPermAdmin] = useState(false);
  const [keyExpiry, setKeyExpiry] = useState("never");

  // Output Generated Key & Embed Script
  const [activeDisplayKey, setActiveDisplayKey] = useState("");
  const [activeEmbedBotId, setActiveEmbedBotId] = useState("");

  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentBot =
      botsData.find((b) => b.id === selectedBotId) || botsData[0];
    const label =
      keyLabelInput.trim() || `คีย์สำหรับ ${currentBot?.name || "แชทบอท"}`;

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: selectedBotId || currentBot?.id,
          type: "PUBLIC_WIDGET",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const rawKey = json.rawKey || json.apiKey?.rawKey;
        if (json?.apiKey && rawKey) {
          setActiveDisplayKey(rawKey);
          setActiveEmbedBotId(selectedBotId || currentBot?.id || "");

          const newKeyObj: ApiKeyItem = {
            id: json.apiKey.id,
            name: label,
            prefix: json.apiKey.keyPrefix,
            bot: currentBot ? currentBot.name : "บอท",
            created: "วันนี้",
            lastUsed: "เพิ่งสร้าง",
            perm: "Public Widget",
          };

          setApiKeysData([newKeyObj, ...apiKeysData]);
          showToast(`สร้าง API Key "${label}" สำเร็จแล้ว!`);
          return;
        }
      }
      showToast("ไม่สามารถสร้าง API Key จากเซิร์ฟเวอร์ได้");
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์เพื่อสร้างคีย์");
    }
  };

  const revokeApiKey = (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการเพิกถอนคีย์ "${name}"?`)) {
      setApiKeysData(apiKeysData.filter((k) => k.id !== id));
      showToast(`เพิกถอนคีย์ "${name}" แล้ว`);
    }
  };

  // ========================================================
  // LOGS STATE & MODAL
  // ========================================================
  const [logsData, setLogsData] = useState<LogItem[]>([]);

  const [logSearch, setLogSearch] = useState("");
  const [logsBotFilter, setLogsBotFilter] = useState("all");
  const [logsStatusFilter, setLogsStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const filteredLogs = useMemo(() => {
    return logsData.filter((log) => {
      const matchSearch = log.id.toLowerCase().includes(logSearch.toLowerCase());
      const matchBot = logsBotFilter === "all" || log.bot === logsBotFilter;
      const matchStatus =
        logsStatusFilter === "all" || log.status.toString() === logsStatusFilter;
      return matchSearch && matchBot && matchStatus;
    });
  }, [logsData, logSearch, logsBotFilter, logsStatusFilter]);

  const copyToClipboard = (text: string, label = "ข้อความ") => {
    navigator.clipboard.writeText(text);
    showToast(`คัดลอก ${label} เรียบร้อยแล้ว`);
  };

  return (
    <div className="w-full min-h-screen topo-bg-warm text-textMain flex antialiased font-sans">
      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ========================================================
          LEFT NAVIGATION SIDEBAR (Sage Green #334539)
         ======================================================== */}
      <aside
        className={`w-64 bg-sidebar text-emerald-100/90 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 border-r border-sidebarBorder select-none ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="h-20 flex items-center px-5 gap-3 border-b border-emerald-950/40">
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

          {/* Navigation Section */}
          <div className="px-3 pt-6">
            <div className="px-3 pb-2 text-[11px] font-semibold text-emerald-200/50 tracking-wider uppercase font-mono">
              WORKSPACE
            </div>

            <nav className="space-y-1.5">
              {/* 1. แดชบอร์ด */}
              <button
                type="button"
                onClick={() => switchTab("dashboard")}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors cursor-pointer ${
                  currentTab === "dashboard"
                    ? "text-white bg-sidebarActive shadow-sm"
                    : "text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === "dashboard" ? "text-emerald-200" : ""
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
              </button>

              {/* 2. จัดการบอท */}
              <Link
                href="/dashboard/bots"
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors text-emerald-100/70 hover:text-white hover:bg-sidebarHover cursor-pointer"
              >
                <svg
                  className="w-4 h-4 shrink-0 text-emerald-100/70"
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
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors text-emerald-100/70 hover:text-white hover:bg-sidebarHover cursor-pointer"
              >
                <svg
                  className="w-4 h-4 shrink-0"
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
              <button
                type="button"
                onClick={() => switchTab("logs")}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors cursor-pointer ${
                  currentTab === "logs"
                    ? "text-white bg-sidebarActive shadow-sm"
                    : "text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === "logs" ? "text-emerald-200" : ""
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
              </button>

              {/* 5. การชำระเงิน */}
              <button
                type="button"
                onClick={() => switchTab("billing")}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-colors cursor-pointer ${
                  currentTab === "billing"
                    ? "text-white bg-sidebarActive shadow-sm"
                    : "text-emerald-100/70 hover:text-white hover:bg-sidebarHover"
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    currentTab === "billing" ? "text-emerald-200" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
                  <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2" />
                </svg>
                <span>การชำระเงิน</span>
              </button>
            </nav>
          </div>
        </div>

        {/* User Profile Footer Area */}
        <div className="p-3 border-t border-emerald-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-sidebarHover/80 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-sidebar font-semibold text-xs flex items-center justify-center shadow">
                {currentUser ? currentUser.email.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-white text-xs font-semibold leading-tight truncate max-w-[120px]">
                  {currentUser ? currentUser.email.split("@")[0] : "Admin"}
                </span>
                <span className="text-[11px] text-emerald-200/70 leading-tight">
                  Starter Plan
                </span>
              </div>
            </div>
            <Link
              href="/"
              title="กลับสู่หน้าหลัก"
              className="text-emerald-200/60 hover:text-white p-1 rounded-md transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT AREA
         ======================================================== */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col overflow-y-auto">
        {/* Top Global App Bar */}
        <header className="h-20 bg-white/75 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between sticky top-0 z-20 border-b border-borderLight/90">
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
              <h1 className="text-lg sm:text-xl font-bold text-textMain tracking-tight">
                {currentTab === "dashboard" && "แผงควบคุม"}
                {currentTab === "bots" && (botSubView === "form" ? "สร้างบอทใหม่" : "จัดการบอท")}
                {currentTab === "apikeys" && (apiSubView === "create" ? "สร้างคีย์ API ใหม่" : "คีย์ API ทั้งหมด")}
                {currentTab === "logs" && "ประวัติการใช้งาน"}
                {currentTab === "billing" && "การชำระเงิน"}
              </h1>
              <p className="text-xs text-textMuted mt-0.5 hidden sm:block">
                {currentTab === "dashboard" && "ภาพรวมระบบและประสิทธิภาพของบอททั้งหมด"}
                {currentTab === "bots" &&
                  (botSubView === "form"
                    ? "ออกแบบและตั้งค่าแชทบอทอัจฉริยะของคุณได้ทันที"
                    : "สร้าง ตั้งค่า และติดตามบอทใน Workspace")}
                {currentTab === "apikeys" &&
                  (apiSubView === "create"
                    ? "เชื่อมต่อแชทบอทของคุณกับหน้าเว็บไซต์ภายนอกด้วยคีย์และสคริปต์"
                    : "จัดการ credentials สำหรับเชื่อมต่อ Botwise API")}
                {currentTab === "logs" && "ตรวจสอบ request, latency และสถานะการทำงานของ API"}
                {currentTab === "billing" && "จัดการแพ็กเกจ การใช้งาน และใบแจ้งหนี้"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
                      onClick={() => {
                        showToast("ทำเครื่องหมายว่าอ่านแล้ว");
                        setNotificationOpen(false);
                      }}
                      className="text-[11px] text-brandGreen font-medium cursor-pointer hover:underline"
                    >
                      อ่านทั้งหมด
                    </button>
                  </div>
                  <div className="divide-y divide-borderLight/60 max-h-60 overflow-y-auto pt-1">
                    {logsData.length > 0 ? (
                      logsData.slice(0, 4).map((log) => (
                        <div key={log.id} className="py-2.5 text-xs">
                          <p className="font-medium text-textMain">{log.bot} ได้รับคำขอ ({log.endpoint})</p>
                          <p className="text-[11px] text-textMuted mt-0.5">{log.time} • สถานะ {log.status}</p>
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

        {/* Content Body Container */}
        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          {/* ========================================================
              VIEW 1: แดชบอร์ด (Dashboard)
             ======================================================== */}
          {currentTab === "dashboard" && (
            <section className="space-y-6 animate-fade-in">
              {/* 4 Metric Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Stat 1 */}
                <Link
                  href="/dashboard/bots"
                  className="bg-cardBg rounded-2xl p-5 border border-borderLight shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-brandGreenLight text-brandGreen flex items-center justify-center group-hover:scale-105 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="4" y="8" width="16" height="12" rx="2" strokeWidth="2" />
                        <circle cx="9" cy="13" r="1" fill="currentColor" />
                        <circle cx="15" cy="13" r="1" fill="currentColor" />
                        <path d="M12 4v4m-10 5h2m16 0h2" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      บอทพร้อมใช้
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-textMain tracking-tight">
                      {botsData.filter((b) => b.status === "active").length}
                    </div>
                    <p className="text-xs text-textMuted mt-1">บอทที่กำลังทำงาน</p>
                  </div>
                </Link>

                {/* Stat 2 */}
                <div className="bg-cardBg rounded-2xl p-5 border border-borderLight shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-brandGreenLight text-brandGreen flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      เรียลไทม์
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-textMain tracking-tight">
                      {totalApiRequests.toLocaleString()}
                    </div>
                    <p className="text-xs text-textMuted mt-1">คำขอ API ทั้งหมด</p>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-cardBg rounded-2xl p-5 border border-borderLight shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-brandGreenLight text-brandGreen flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      เสถียรภาพ
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-textMain tracking-tight">
                      {totalApiRequests > 0 ? "100%" : "-"}
                    </div>
                    <p className="text-xs text-textMuted mt-1">อัตราความสำเร็จ</p>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="bg-cardBg rounded-2xl p-5 border border-borderLight shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-brandGreenLight text-brandGreen flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      คงเหลือ
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-textMain tracking-tight">{userCredits}</div>
                    <p className="text-xs text-textMuted mt-1">เครดิตคงเหลือในบัญชี</p>
                  </div>
                </div>
              </div>

              {/* Chart & Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Chart Card */}
                <div className="lg:col-span-8 bg-cardBg rounded-2xl p-6 border border-borderLight shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-textMain">การใช้งานล่าสุด</h3>
                      <p className="text-xs text-textMuted mt-0.5">14 วันที่ผ่านมา &bull; คำขอ API จริง ({totalApiRequests.toLocaleString()} ครั้ง)</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-textMuted">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-chartBlue"></span>
                        <span>คำขอทั้งหมด</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-chartDark"></span>
                        <span>สำเร็จ</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Bar Chart */}
                  {totalApiRequests === 0 || dailyUsageStats.every((d) => d.total === 0) ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2.5 border-b border-borderLight">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-brandGreen flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-textMain">ยังไม่มีข้อมูลคำขอ API ในช่วง 14 วันที่ผ่านมา</p>
                      <p className="text-[11px] text-textMuted max-w-sm">
                        เมื่อมีการเรียกใช้งานบอทผ่าน Web Widget หรือ API สถิติจำนวนคำขอและความสำเร็จจะแสดงที่นี่แบบเรียลไทม์
                      </p>
                    </div>
                  ) : (
                    <div className="relative h-64 pt-4 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-borderLight pb-2">
                      {dailyUsageStats.map((item, idx) => {
                        const maxVal = Math.max(...dailyUsageStats.map((d) => d.total), 1);
                        const totalHeight = item.total > 0 ? (item.total / maxVal) * 85 + 10 : 4;
                        const successHeight = item.success > 0 ? (item.success / maxVal) * 85 + 10 : 4;
                        return (
                          <div key={idx} className="flex items-end gap-1 group relative flex-1 justify-center h-full">
                            <div
                              style={{ height: `${totalHeight}%` }}
                              className="w-2.5 sm:w-3.5 bg-chartBlue rounded-t-sm transition-all group-hover:brightness-110"
                            />
                            <div
                              style={{ height: `${successHeight}%` }}
                              className="w-2.5 sm:w-3.5 bg-chartDark rounded-t-sm transition-all group-hover:brightness-110"
                            />
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                              <span className="font-semibold">{item.date}</span>
                              <span>คำขอ: {item.total} ครั้ง</span>
                              <span className="text-emerald-400">สำเร็จ: {item.success} ครั้ง</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between text-[11px] text-textSubtle px-2">
                    <span>{dailyUsageStats[0]?.date || "14 วันก่อน"}</span>
                    <span>{dailyUsageStats[Math.floor(dailyUsageStats.length / 2)]?.date || "7 วันก่อน"}</span>
                    <span>วันนี้</span>
                  </div>
                </div>

                {/* Activities Card */}
                <div className="lg:col-span-4 bg-cardBg rounded-2xl p-6 border border-borderLight shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-textMain">กิจกรรมล่าสุด</h3>
                    <button
                      type="button"
                      onClick={() => switchTab("logs")}
                      className="text-xs text-brandGreen hover:underline font-medium transition cursor-pointer"
                    >
                      ดูกิจกรรมทั้งหมด
                    </button>
                  </div>

                  <div className="space-y-4 pt-1">
                    {logsData.length > 0 ? (
                      logsData.slice(0, 4).map((log) => (
                        <div key={log.id} className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 ring-4 ring-emerald-50"></div>
                          <div>
                            <h4 className="text-xs font-semibold text-textMain">{log.bot} ได้รับคำขอ ({log.endpoint})</h4>
                            <p className="text-[11px] text-textMuted mt-0.5">{log.time} • สถานะ {log.status}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-textMuted">
                        ยังไม่มีประวัติกิจกรรมล่าสุดในระบบ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================
              VIEW 2: จัดการบอท (Bot Management & Creation Page)
             ======================================================== */}
          {currentTab === "bots" && (
            <section className="space-y-6 animate-fade-in">
              {/* Tab Selector between Creation Form & List */}
              <div className="flex items-center justify-between border-b border-borderLight pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBotSubView("form")}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer ${
                      botSubView === "form"
                        ? "bg-brandGreen text-white"
                        : "bg-white border border-borderLight text-textMuted hover:text-textMain hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>สร้างบอทใหม่</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotSubView("list")}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      botSubView === "list"
                        ? "bg-brandGreen text-white shadow-sm"
                        : "bg-white border border-borderLight text-textMuted hover:text-textMain hover:bg-slate-50"
                    }`}
                  >
                    <span>รายการบอททั้งหมด ({botsData.length})</span>
                  </button>
                </div>
              </div>

              {/* SUBVIEW A: สร้างบอทใหม่ (The Full Page Form) */}
              {botSubView === "form" && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-cardBg rounded-2xl border border-borderLight shadow-sm p-6 sm:p-8 space-y-7">
                    <div>
                      <h2 className="text-base font-bold text-textMain tracking-tight">
                        ข้อมูลพื้นฐานแชทบอท
                      </h2>
                    </div>

                    <form onSubmit={handleCreateBotFull} className="space-y-6">
                      {/* ชื่อบอท */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-2">
                          ชื่อบอท (Bot Name)
                        </label>
                        <input
                          type="text"
                          required
                          value={formBotName}
                          onChange={(e) => setFormBotName(e.target.value)}
                          placeholder="เช่น ชาร์มมิ่งซัพพอร์ต, น้องถุงเงิน"
                          className="w-full bg-white border border-borderLight rounded-xl px-4 py-3 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen transition shadow-sm"
                        />
                      </div>

                      {/* คำอธิบายแชทบอท */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-2">
                          คำอธิบายแชทบอท
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={formBotDesc}
                          onChange={(e) => setFormBotDesc(e.target.value)}
                          placeholder="ระบุวัตถุประสงค์ของบอทตัวนี้ เช่น บอทสำหรับตอบคำถามลูกค้าหน้าเว็บไซต์ขายเสื้อผ้า"
                          className="w-full bg-white border border-borderLight rounded-xl p-4 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen transition shadow-sm resize-none"
                        />
                      </div>

                      {/* เลือกโมเดล AI */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-2">
                          เลือกโมเดล AI (AI Model)
                        </label>
                        <div className="relative">
                          <select
                            value={formBotModel}
                            onChange={(e) => setFormBotModel(e.target.value)}
                            className="w-full appearance-none bg-white border border-borderLight rounded-xl px-4 py-3 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen transition shadow-sm cursor-pointer pr-10"
                          >
                            <option value="GPT-4o (แนะนำสำหรับภาษาไทย)">GPT-4o (แนะนำสำหรับภาษาไทย)</option>
                            <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet (การวิเคราะห์ลึกซึ้ง & โค้ด)</option>
                            <option value="Gemini 2.5 Pro">Gemini 2.5 Pro (Multimodal & Context ใหญ่)</option>
                            <option value="GPT-4.1 mini">GPT-4.1 mini (รวดเร็ว & ประหยัดต้นทุน)</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* อัปโหลดข้อมูลความรู้ (Knowledge Base) */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-2">
                          อัปโหลดข้อมูลความรู้ (Knowledge Base)
                        </label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                            isDragOver
                              ? "border-brandGreen bg-emerald-50"
                              : "border-brandGreen/50 bg-[#F7FAF8] hover:bg-[#F0F5F1]"
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            accept=".pdf,.txt,.docx"
                            onChange={(e) => {
                              if (e.target.files) handleAddFiles(e.target.files);
                            }}
                          />
                          <div className="w-12 h-12 rounded-full bg-brandGreenLight text-brandGreen flex items-center justify-center mb-3 group-hover:scale-105 transition shadow-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-xs font-medium text-brandGreen">
                            ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อค้นหาไฟล์
                          </p>
                          <p className="text-[11px] text-textMuted mt-1">
                            รองรับไฟล์ PDF, TXT, DOCX ขนาดสูงสุด 10MB
                          </p>
                        </div>

                        {/* Uploaded Files Chips */}
                        {uploadedFiles.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {uploadedFiles.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 bg-brandGreenLight border border-brandGreenBorder px-3 py-1.5 rounded-lg text-xs text-textMain"
                              >
                                <svg className="w-3.5 h-3.5 text-brandGreen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h4m-7 4h12a2 2 0 002-2V6a2 2 0 00-2-2H8l-4 4v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">{file.name}</span>
                                <span className="text-[10px] text-textMuted">({file.size})</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeUploadedFile(idx);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition ml-1 cursor-pointer"
                                  title="ลบไฟล์"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ตั้งค่า Personality / Tone */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-2">
                          ตั้งค่า Personality / Tone
                        </label>
                        <textarea
                          rows={3}
                          value={formBotTone}
                          onChange={(e) => setFormBotTone(e.target.value)}
                          placeholder="เช่น บอทใจดี สุภาพ ตอบเร็ว มีหางเสียงลงท้ายด้วย 'ค่ะ' เสมอ"
                          className="w-full bg-white border border-borderLight rounded-xl p-4 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen transition shadow-sm resize-none"
                        />
                      </div>

                      {/* Bottom Form Actions */}
                      <div className="pt-4 flex items-center justify-end gap-3 border-t border-borderLight">
                        <button
                          type="button"
                          onClick={resetBotForm}
                          className="px-5 py-2.5 rounded-xl border border-borderLight text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-brandGreen hover:bg-brandGreenHover text-white text-xs font-semibold shadow-md shadow-emerald-900/10 transition cursor-pointer"
                        >
                          สร้างบอท
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* SUBVIEW B: รายการบอททั้งหมด */}
              {botSubView === "list" && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={botSearch}
                        onChange={(e) => setBotSearch(e.target.value)}
                        placeholder="ค้นหาบอท..."
                        className="w-full bg-white border border-borderLight rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen shadow-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <select
                        value={botStatusFilter}
                        onChange={(e) => setBotStatusFilter(e.target.value)}
                        className="bg-white border border-borderLight text-xs text-textMain font-medium rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-brandGreen cursor-pointer"
                      >
                        <option value="all">ทุกสถานะ</option>
                        <option value="active">ทำงาน</option>
                        <option value="paused">หยุดชั่วคราว</option>
                      </select>

                      <select
                        value={botModelFilter}
                        onChange={(e) => setBotModelFilter(e.target.value)}
                        className="bg-white border border-borderLight text-xs text-textMain font-medium rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-brandGreen cursor-pointer"
                      >
                        <option value="all">ทุกโมเดล</option>
                        <option value="GPT-4o">GPT-4o</option>
                        <option value="GPT-4.1">GPT-4.1</option>
                        <option value="Claude 3.7">Claude 3.7</option>
                        <option value="Gemini 2.5 Pro">Gemini 2.5 Pro</option>
                        <option value="GPT-4.1 mini">GPT-4.1 mini</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-cardBg rounded-2xl border border-borderLight shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-borderLight flex items-center justify-between">
                      <h3 className="font-bold text-sm text-textMain">บอทที่พร้อมใช้งาน</h3>
                      <span className="text-xs text-textMuted font-medium">
                        {filteredBots.length} บอท
                      </span>
                    </div>

                    <div className="divide-y divide-borderLight">
                      {filteredBots.map((bot) => (
                        <div
                          key={bot.id}
                          className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brandGreenLight text-brandGreen flex items-center justify-center shrink-0 border border-brandGreenBorder">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="4" y="8" width="16" height="12" rx="2" strokeWidth="2" />
                                <circle cx="9" cy="13" r="1" fill="currentColor" />
                                <circle cx="15" cy="13" r="1" fill="currentColor" />
                                <path d="M12 4v4" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-textMain leading-tight">{bot.name}</h4>
                              <p className="text-xs text-textMuted mt-0.5">{bot.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center flex-wrap gap-6 text-xs">
                            <div>
                              <span className="text-[10px] text-textMuted uppercase font-semibold block font-mono">
                                MODEL
                              </span>
                              <span className="font-semibold text-textMain">{bot.model}</span>
                            </div>
                            <div className="text-textMuted">{bot.lastActive}</div>
                            <div>
                              {bot.status === "active" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  ทำงาน
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  หยุดชั่วคราว
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => showToast(`เปิดการตั้งค่าของ ${bot.name}`)}
                              className="px-3.5 py-1.5 border border-borderLight rounded-xl text-xs font-semibold text-textMain hover:bg-slate-100 transition shadow-sm cursor-pointer"
                            >
                              จัดการ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ========================================================
              VIEW 3: คีย์ API (Create API Key & Embed Script)
             ======================================================== */}
          {currentTab === "apikeys" && (
            <section className="space-y-6 animate-fade-in">
              {/* Top Quick Toggler between Key Creator and Key List */}
              <div className="flex items-center justify-between border-b border-borderLight pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setApiSubView("create")}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer ${
                      apiSubView === "create"
                        ? "bg-brandGreen text-white"
                        : "bg-white border border-borderLight text-textMuted hover:text-textMain hover:bg-slate-50"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>สร้างคีย์ API ใหม่</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiSubView("list")}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      apiSubView === "list"
                        ? "bg-brandGreen text-white shadow-sm"
                        : "bg-white border border-borderLight text-textMuted hover:text-textMain hover:bg-slate-50"
                    }`}
                  >
                    <span>คีย์ทั้งหมดที่ใช้งาน ({apiKeysData.length})</span>
                  </button>
                </div>
              </div>

              {/* SUBVIEW A: Side-by-Side 2 Column Setup */}
              {apiSubView === "create" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: ตั้งค่าสิทธิ์การใช้งานคีย์ใหม่ */}
                  <div className="lg:col-span-5 bg-cardBg rounded-2xl border border-borderLight shadow-sm p-6 space-y-5">
                    <h3 className="text-sm font-bold text-textMain">ตั้งค่าสิทธิ์การใช้งานคีย์ใหม่</h3>

                    <form onSubmit={handleGenerateApiKey} className="space-y-4">
                      {/* เลือกบอทที่ต้องการเชื่อมต่อ */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-1.5">
                          เลือกบอทที่ต้องการเชื่อมต่อ (Select Bot)
                        </label>
                        <div className="relative">
                          <select
                            value={selectedBotId}
                            onChange={(e) => setSelectedBotId(e.target.value)}
                            className="w-full appearance-none bg-white border border-borderLight rounded-xl px-3.5 py-2.5 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen cursor-pointer pr-9 shadow-sm"
                          >
                            {botsData.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
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

                      {/* ชื่อคีย์สำหรับการจดจำ */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-1.5">
                          ชื่อคีย์สำหรับการจดจำ (Key Label)
                        </label>
                        <input
                          type="text"
                          value={keyLabelInput}
                          onChange={(e) => setKeyLabelInput(e.target.value)}
                          placeholder="เช่น คีย์เว็บหลัก, คีย์เซิร์ฟเวอร์สำรอง"
                          className="w-full bg-white border border-borderLight rounded-xl px-3.5 py-2.5 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen shadow-sm"
                        />
                      </div>

                      {/* สิทธิ์การใช้งาน (Permissions) */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-2">
                          สิทธิ์การใช้งาน (Permissions)
                        </label>
                        <div className="space-y-2 text-xs">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={permRead}
                              onChange={(e) => setPermRead(e.target.checked)}
                              className="w-4 h-4 rounded text-brandGreen focus:ring-brandGreen border-slate-300"
                            />
                            <span className="text-textMain">Read (อ่านข้อมูลความรู้ / ส่งข้อความคุย)</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={permWrite}
                              onChange={(e) => setPermWrite(e.target.checked)}
                              className="w-4 h-4 rounded text-brandGreen focus:ring-brandGreen border-slate-300"
                            />
                            <span className="text-textMuted hover:text-textMain">
                              Write (อัปโหลดความรู้ / เปลี่ยนแปลงโปรไฟล์บอท)
                            </span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={permAdmin}
                              onChange={(e) => setPermAdmin(e.target.checked)}
                              className="w-4 h-4 rounded text-brandGreen focus:ring-brandGreen border-slate-300"
                            />
                            <span className="text-textMuted hover:text-textMain">
                              Admin (ควบคุมสิทธิ์แอดมินทั้งหมด)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* วันหมดอายุคีย์ */}
                      <div>
                        <label className="block text-xs font-medium text-textMain mb-1.5">
                          วันหมดอายุคีย์ (Expiry Date)
                        </label>
                        <div className="relative">
                          <select
                            value={keyExpiry}
                            onChange={(e) => setKeyExpiry(e.target.value)}
                            className="w-full appearance-none bg-white border border-borderLight rounded-xl px-3.5 py-2.5 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-brandGreen/20 focus:border-brandGreen cursor-pointer pr-9 shadow-sm"
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

                      {/* Submit Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-brandGreen hover:bg-brandGreenHover text-white text-xs font-semibold shadow-md shadow-emerald-900/10 transition cursor-pointer"
                        >
                          สร้าง API Key ใหม่
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right Column: สร้างคีย์สำเร็จแล้ว! Output Box */}
                  <div className="lg:col-span-7 bg-cardBg rounded-2xl border border-borderLight shadow-sm p-6 space-y-6">
                    {activeDisplayKey ? (
                      <>
                        {/* Success Status Header */}
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-base font-bold text-textMain">สร้างคีย์สำเร็จแล้ว!</h3>
                        </div>

                        <p className="text-xs text-textMuted leading-relaxed">
                          คีย์นี้สร้างขึ้นเรียบร้อยแล้ว โปรดคัดลอกเก็บไว้ให้ปลอดภัยเพราะคุณจะไม่สามารถดูโทเค็นเต็มได้อีกครั้งหลังจากปิดหน้านี้
                        </p>

                        {/* API Key Output Field */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-textMain">API Key</label>
                          <div className="flex items-center bg-[#F6F8F6] border border-borderLight rounded-xl px-4 py-3 justify-between gap-3">
                            <span className="font-mono text-xs text-textMain font-medium select-all break-all">
                              {activeDisplayKey}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeDisplayKey, "API Key")}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-borderLight hover:bg-slate-50 text-textMain rounded-lg text-xs font-medium transition shadow-sm cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
                              </svg>
                              <span>คัดลอกคีย์</span>
                            </button>
                          </div>
                        </div>

                        {/* One-Line Embed Script Box */}
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-bold text-textMain">
                              สคริปต์หน้าเว็บแบบ 1 บรรทัด (One-Line Embed Script)
                            </label>
                            <p className="text-[11px] text-textMuted mt-0.5">
                              คัดลอกโค้ดสคริปต์นี้ไปแปะหน้าเว็บในแท็ก &lt;body&gt; ของหน้าเว็บที่ต้องการแสดงหน้าต่างแชททันที
                            </p>
                          </div>

                          {/* Terminal Code Box */}
                          <div className="bg-[#111915] rounded-xl p-3.5 flex items-center justify-between gap-3 border border-emerald-950">
                            <code className="font-mono text-[11px] text-emerald-300 break-all select-all leading-relaxed">
                              {`<script src="${appOrigin}/widget.js" data-bot-key="${activeDisplayKey}" data-bot="${activeEmbedBotId}" defer></script>`}
                            </code>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  `<script src="${appOrigin}/widget.js" data-bot-key="${activeDisplayKey}" data-bot="${activeEmbedBotId}" defer></script>`,
                                  "โค้ด Embed Script"
                                )
                              }
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brandGreen hover:bg-brandGreenHover text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
                              </svg>
                              <span>คัดลอกโค้ด</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-16 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-brandGreenLight text-brandGreen flex items-center justify-center mx-auto">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="8" cy="8" r="4" strokeWidth="2" />
                            <path d="M10.8 10.8L18 18m-2-2l2 2m0-3l2 2" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-sm text-textMain">พร้อมสร้างคีย์ API สำหรับบอทของคุณ</h4>
                        <p className="text-xs text-textMuted max-w-sm mx-auto leading-relaxed">
                          เลือกบอทและกำหนดชื่อคีย์ทางฝั่งซ้าย จากนั้นกดปุ่ม &quot;สร้างคีย์ API&quot; เพื่อรับโทเค็นความปลอดภัยและโค้ด One-Line Embed สำหรับติดหน้าเว็บ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBVIEW B: คีย์ทั้งหมดที่ใช้งาน (Existing Keys Table) */}
              {apiSubView === "list" && (
                <div className="space-y-4">
                  <div className="bg-cardBg rounded-2xl border border-borderLight shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-borderLight flex items-center justify-between">
                      <h3 className="font-bold text-sm text-textMain">คีย์ทั้งหมดที่ลงทะเบียน</h3>
                      <span className="text-xs text-textMuted">{apiKeysData.length} คีย์ที่ใช้งาน</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 border-b border-borderLight text-textMuted uppercase font-semibold text-[11px] tracking-wider font-mono">
                          <tr>
                            <th className="py-3 px-6">ชื่อ</th>
                            <th className="py-3 px-6">PREFIX</th>
                            <th className="py-3 px-6">วันที่สร้าง</th>
                            <th className="py-3 px-6">ใช้งานล่าสุด</th>
                            <th className="py-3 px-6">สิทธิ์</th>
                            <th className="py-3 px-6 text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderLight">
                          {apiKeysData.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-textMuted text-xs">
                                ยังไม่มีคีย์ API ที่ถูกสร้างในระบบ
                              </td>
                            </tr>
                          ) : (
                            apiKeysData.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-4 px-6 font-semibold text-textMain">{item.name}</td>
                              <td className="py-4 px-6 font-mono text-slate-700 flex items-center gap-2">
                                <span>{item.prefix}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.prefix, "Prefix")}
                                  className="text-slate-400 hover:text-brandGreen transition p-1 cursor-pointer"
                                  title="คัดลอก prefix"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </td>
                              <td className="py-4 px-6 text-textMuted">{item.created}</td>
                              <td className="py-4 px-6 text-textMuted">{item.lastUsed}</td>
                              <td className="py-4 px-6">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  {item.perm}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  type="button"
                                  onClick={() => revokeApiKey(item.id, item.name)}
                                  className="text-rose-600 hover:text-rose-700 font-semibold text-xs transition cursor-pointer"
                                >
                                  เพิกถอน
                                </button>
                              </td>
                            </tr>
                          )))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ========================================================
              VIEW 4: ประวัติการใช้งาน (Logs / API History)
             ======================================================== */}
          {currentTab === "logs" && (
            <section className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => showToast("เลือกช่วงเวลา 24 ชั่วโมงล่าสุด")}
                    className="bg-white border border-borderLight text-xs text-textMain font-medium rounded-xl px-3 py-2 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>24 ชั่วโมงล่าสุด</span>
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                    </svg>
                  </button>

                  <select
                    value={logsBotFilter}
                    onChange={(e) => setLogsBotFilter(e.target.value)}
                    className="bg-white border border-borderLight text-xs text-textMain font-medium rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-brandGreen cursor-pointer"
                  >
                    <option value="all">บอททั้งหมด</option>
                    {botsData.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={logsStatusFilter}
                    onChange={(e) => setLogsStatusFilter(e.target.value)}
                    className="bg-white border border-borderLight text-xs text-textMain font-medium rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-brandGreen cursor-pointer"
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="200">200 OK</option>
                    <option value="429">429 Rate Limit</option>
                    <option value="500">500 Server Error</option>
                  </select>
                </div>

                <div className="relative w-full md:w-64">
                  <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="ค้นหา Request ID..."
                    className="w-full bg-white border border-borderLight rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brandGreen shadow-sm"
                  />
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-cardBg rounded-2xl p-4 border border-borderLight shadow-sm">
                  <span className="text-[11px] text-textMuted uppercase tracking-wider font-semibold font-mono">Requests</span>
                  <div className="text-2xl font-extrabold text-textMain mt-1">{totalApiRequests || logsData.length}</div>
                </div>
                <div className="bg-cardBg rounded-2xl p-4 border border-borderLight shadow-sm">
                  <span className="text-[11px] text-textMuted uppercase tracking-wider font-semibold font-mono">Success</span>
                  <div className="text-2xl font-extrabold text-textMain mt-1">
                    {logsData.length > 0 ? `${((logsData.filter((l) => l.status === 200).length / logsData.length) * 100).toFixed(1)}%` : "100%"}
                  </div>
                </div>
                <div className="bg-cardBg rounded-2xl p-4 border border-borderLight shadow-sm">
                  <span className="text-[11px] text-textMuted uppercase tracking-wider font-semibold font-mono">P95 latency</span>
                  <div className="text-2xl font-extrabold text-textMain mt-1">
                    {logsData.length > 0 ? logsData[0].latency : "250 ms"}
                  </div>
                </div>
                <div className="bg-cardBg rounded-2xl p-4 border border-borderLight shadow-sm">
                  <span className="text-[11px] text-textMuted uppercase tracking-wider font-semibold font-mono">Errors</span>
                  <div className="text-2xl font-extrabold text-red-500 mt-1">
                    {logsData.filter((l) => l.status !== 200).length}
                  </div>
                </div>
              </div>

              {/* Request Log Table */}
              <div className="bg-cardBg rounded-2xl border border-borderLight shadow-sm overflow-hidden">
                <div className="p-5 border-b border-borderLight flex items-center justify-between">
                  <h3 className="font-bold text-sm text-textMain">Request log</h3>
                  <span className="text-xs text-textMuted flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    อัปเดตแบบเรียลไทม์
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-borderLight text-textMuted uppercase font-semibold text-[11px] tracking-wider font-mono">
                      <tr>
                        <th className="py-3 px-6">REQUEST ID</th>
                        <th className="py-3 px-6">บอท</th>
                        <th className="py-3 px-6">ENDPOINT</th>
                        <th className="py-3 px-6">สถานะ</th>
                        <th className="py-3 px-6">LATENCY</th>
                        <th className="py-3 px-6">เวลา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderLight">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-textMuted text-xs">
                            ไม่พบบันทึกการเรียกใช้งาน API ในขณะนี้
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <tr
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-slate-50/70 transition cursor-pointer"
                          >
                            <td className="py-4 px-6 font-mono text-brandGreen font-semibold">{log.id}</td>
                            <td className="py-4 px-6 text-textMain font-medium">{log.bot}</td>
                            <td className="py-4 px-6 font-mono text-slate-600">{log.endpoint}</td>
                            <td className="py-4 px-6">
                              {log.status === 200 ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>200 OK
                                </span>
                              ) : log.status === 429 ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>429
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>500
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-textMuted">{log.latency}</td>
                            <td className="py-4 px-6 text-textMuted">{log.time}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================
              VIEW 5: การชำระเงิน (Billing)
             ======================================================== */}
          {currentTab === "billing" && (
            <section className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-cardBg rounded-2xl p-6 border border-borderLight shadow-sm space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] text-brandGreen font-semibold bg-brandGreenLight px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                        แพ็กเกจปัจจุบัน
                      </span>
                      <h2 className="text-2xl font-extrabold text-textMain">Starter Plan</h2>
                      <p className="text-xs text-textMuted mt-0.5">ใช้งานฟรี &bull; 100 เครดิตเริ่มต้น</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast("แพ็กเกจ Enterprise และระบบชำระเงินออนไลน์จะเปิดให้บริการเร็วๆ นี้")}
                      className="text-xs font-semibold px-4 py-2 border border-borderLight rounded-xl text-textMain hover:bg-slate-50 transition shadow-sm cursor-pointer"
                    >
                      เปลี่ยนแพ็กเกจ
                    </button>
                  </div>

                  <div className="space-y-5 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-textMain">API credits</span>
                        <span className="font-mono text-textMuted">{userCredits} / 100 เครดิตคงเหลือ</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-brandGreen h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, userCredits))}%` }}
                        ></div>
                      </div>
                      <div className="text-[11px] text-textMuted">คำขอที่ถูกเรียกใช้จริงทั้งหมด: {totalApiRequests.toLocaleString()} ครั้ง</div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-textMain">Bot seats</span>
                        <span className="font-mono text-textMuted">{botsData.length} / 5 บอท</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-brandGreen h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (botsData.length / 5) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-[11px] text-textMuted">สามารถสร้างได้อีก {Math.max(0, 5 - botsData.length)} บอท</div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-textMain">Vector Knowledge Storage</span>
                        <span className="font-mono text-textMuted">Active (Embedded)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-brandGreen h-2 rounded-full" style={{ width: "25%" }}></div>
                      </div>
                      <div className="text-[11px] text-textMuted">ระบบจัดเก็บฐานความรู้เวกเตอร์แบบเรียลไทม์</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-cardBg rounded-2xl p-6 border border-borderLight shadow-sm space-y-4">
                    <div>
                      <span className="text-xs text-textMuted font-medium">ค่าใช้จ่ายรอบนี้</span>
                      <div className="text-3xl font-extrabold text-textMain mt-1">฿0</div>
                      <p className="text-[11px] text-textMuted mt-1">Starter Tier &bull; ใช้งานฟรีไม่มีค่าบริการรายเดือน</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-borderLight text-xs">
                      <div className="flex items-center justify-between text-textMuted">
                        <span>Base plan</span>
                        <span className="font-medium text-textMain">฿0</span>
                      </div>
                      <div className="flex items-center justify-between text-textMuted">
                        <span>Model usage</span>
                        <span className="font-medium text-emerald-600 font-medium">ฟรี (Starter)</span>
                      </div>
                      <div className="flex items-center justify-between text-textMuted">
                        <span>Storage add-on</span>
                        <span className="font-medium text-emerald-600 font-medium">ฟรี</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-cardBg rounded-2xl p-5 border border-borderLight shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-textMain">วิธีชำระเงิน</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-textMuted flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>ไม่มีการผูกบัตรเครดิต (ใช้แพ็กเกจฟรี Starter Plan)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices History Table */}
              <div className="bg-cardBg rounded-2xl border border-borderLight shadow-sm overflow-hidden">
                <div className="p-5 border-b border-borderLight flex items-center justify-between">
                  <h3 className="font-bold text-sm text-textMain">ประวัติใบแจ้งหนี้</h3>
                </div>

                <div className="p-8 text-center text-xs text-textMuted">
                  ยังไม่มีรายการใบแจ้งหนี้ (บัญชีเริ่มต้นฟรี Starter Plan)
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ========================================================
          MODAL: รายละเอียด Request Log
         ======================================================== */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-borderLight overflow-hidden">
            <div className="p-5 border-b border-borderLight flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-textMain font-mono">{selectedLog.id}</h3>
                <p className="text-[11px] text-textMuted font-mono">{selectedLog.endpoint}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-textMuted text-[10px] block uppercase font-semibold font-mono">Status</span>
                  <span className="font-bold text-emerald-600 text-sm mt-0.5 block">{selectedLog.status} OK</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-textMuted text-[10px] block uppercase font-semibold font-mono">Latency</span>
                  <span className="font-bold text-textMain text-sm mt-0.5 block">{selectedLog.latency}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-textMuted text-[10px] block uppercase font-semibold font-mono">Bot</span>
                  <span className="font-bold text-textMain text-sm mt-0.5 block truncate">{selectedLog.bot}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-textMain block mb-1.5">Request Payload</span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify({ prompt: "สอบถามเวลาทำการ", max_tokens: 150 }, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-xs font-semibold text-textMain block mb-1.5">Response Data</span>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify(
                    {
                      response: "บริษัทเปิดทำการทุกวันจันทร์ - ศุกร์ เวลา 09.00 - 18.00 น. ครับ",
                      status: "completed",
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      <div
        className={`fixed bottom-6 right-6 font-mono text-xs bg-sidebar text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-700/50 transition-all duration-300 z-50 ${
          toastMessage
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {toastMessage || ""}
      </div>
    </div>
  );
}
