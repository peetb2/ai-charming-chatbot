"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Sidebar from "@/components/dashboard/Sidebar";
import { BotItem } from "@/lib/bot-store";
import {
  Bot,
  Plus,
  Search,
  Key,
  BookOpen,
  FileText,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronRight,
  Filter,
  X,
  Database,
} from "lucide-react";

interface KnowledgeDocItem {
  id: string;
  title: string;
  fileType: string;
  fileSize: string | null;
  chunkCount: number;
  status: string;
  createdAt: string;
}

interface SearchChunkResult {
  id: string;
  documentTitle: string;
  content: string;
  similarity: number;
}

export default function BotListPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bot list state loaded from DB
  const [botsData, setBotsData] = useState<BotItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");

  // Knowledge Management Modal State
  const [managingBot, setManagingBot] = useState<BotItem | null>(null);
  const [modalTab, setModalTab] = useState<"docs" | "upload" | "test">("docs");
  const [botDocuments, setBotDocuments] = useState<KnowledgeDocItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Modal Upload Form State
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Semantic Search Test State
  const [testQuery, setTestQuery] = useState("");
  const [testSearching, setTestSearching] = useState(false);
  const [testResults, setTestResults] = useState<SearchChunkResult[]>([]);

  // Fetch real bots
  const loadBots = async () => {
    try {
      const res = await fetch("/api/bots");
      if (res.ok) {
        const data = await res.json();
        if (data?.bots && Array.isArray(data.bots)) {
          const realBots: BotItem[] = data.bots.map((b: any) => ({
            id: b.id,
            name: b.name,
            desc: b.systemPrompt ? b.systemPrompt.slice(0, 95) : "บอทผู้ช่วย AI สำหรับตอบคำถามและบริการ",
            systemPrompt: b.systemPrompt,
            model: b.model || "gemini-1.5-flash",
            lastActive: b.createdAt
              ? `สร้างเมื่อ ${new Date(b.createdAt).toLocaleDateString("th-TH")}`
              : "เพิ่งสร้าง",
            status: b.isActive ? "active" : "paused",
            knowledgeCount: b._count?.knowledgeDocs ?? 0,
            usageCount: b._count?.usageLogs ?? 0,
          }));
          setBotsData(realBots);
        }
      }
    } catch (err) {
      console.error("Error loading bots:", err);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadBots();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toggle Bot Active/Paused
  const toggleBotStatus = async (botId: string, currentStatus: "active" | "paused") => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    setBotsData((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: nextStatus } : b))
    );
    try {
      await fetch(`/api/bots/${botId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus === "active" }),
      });
      showToast(`เปลี่ยนสถานะเป็น "${nextStatus === "active" ? "ทำงาน" : "หยุดชั่วคราว"}" แล้ว`);
    } catch {
      showToast("บันทึกการเปลี่ยนแปลงแล้ว");
    }
  };

  // Open Knowledge Management Modal
  const handleOpenKnowledgeModal = async (bot: BotItem) => {
    setManagingBot(bot);
    setModalTab("docs");
    setDocsLoading(true);
    setTestResults([]);
    setTestQuery("");

    try {
      const res = await fetch(`/api/bots/${bot.id}/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setBotDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error loading bot documents:", err);
      showToast("ไม่สามารถโหลดรายการเอกสารได้");
    } finally {
      setDocsLoading(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (!managingBot) return;

    try {
      const res = await fetch(`/api/bots/${managingBot.id}/knowledge/${docId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setBotDocuments((prev) => prev.filter((d) => d.id !== docId));
        // Update bot knowledge count in list
        setBotsData((prev) =>
          prev.map((b) =>
            b.id === managingBot.id
              ? { ...b, knowledgeCount: Math.max(0, (b.knowledgeCount || 1) - 1) }
              : b
          )
        );
        showToast(`ลบเอกสาร "${docTitle}" เรียบร้อยแล้ว`);
      } else {
        showToast("ลบเอกสารไม่สำเร็จ");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการลบเอกสาร");
    }
  };

  // Handle Uploading a new Document to Bot
  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingBot) return;
    if (!uploadTitle.trim() || !uploadContent.trim()) {
      showToast("กรุณาระบุทั้งชื่อและเนื้อหาเอกสาร");
      return;
    }

    setUploadingDoc(true);

    try {
      const res = await fetch(`/api/bots/${managingBot.id}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          content: uploadContent.trim(),
          fileType: "text",
          fileSize: `${(new Blob([uploadContent]).size / 1024).toFixed(1)} KB`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "อัปโหลดเอกสารไม่สำเร็จ");
      }

      showToast(`อัปโหลดและสร้างเวกเตอร์เอกสาร "${uploadTitle}" สำเร็จ!`);
      setUploadTitle("");
      setUploadContent("");

      // Refresh documents
      const docsRes = await fetch(`/api/bots/${managingBot.id}/knowledge`);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setBotDocuments(docsData.documents || []);
      }

      // Update count in bots list
      setBotsData((prev) =>
        prev.map((b) =>
          b.id === managingBot.id
            ? { ...b, knowledgeCount: (b.knowledgeCount || 0) + 1 }
            : b
        )
      );

      setModalTab("docs");
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการนำเข้าเอกสาร");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handle File Input in Modal
  const handleModalFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, "UTF-8");
      });

      setUploadTitle(file.name);
      setUploadContent(text);
      showToast(`อ่านไฟล์ "${file.name}" เรียบร้อย ตรวจสอบและกดบันทึกได้ทันที`);
    } catch {
      showToast("ไม่สามารถอ่านไฟล์ข้อความได้");
    }
  };

  // Run Semantic Search Test against Bot's Vectors
  const handleRunSearchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingBot || !testQuery.trim()) return;

    setTestSearching(true);
    try {
      const res = await fetch(
        `/api/bots/${managingBot.id}/knowledge?query=${encodeURIComponent(testQuery.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        setTestResults(data.searchResults || []);
        if (!data.searchResults || data.searchResults.length === 0) {
          showToast("ไม่พบส่วนของเอกสารที่ตรงกับคำค้นหา");
        }
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการทดสอบค้นหา");
    } finally {
      setTestSearching(false);
    }
  };

  // Filtering bots
  const filteredBots = useMemo(() => {
    return botsData.filter((bot) => {
      const matchSearch =
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "all" || bot.status === statusFilter;
      const matchModel =
        modelFilter === "all" ||
        bot.model.toLowerCase().includes(modelFilter.toLowerCase());
      return matchSearch && matchStatus && matchModel;
    });
  }, [botsData, searchQuery, statusFilter, modelFilter]);

  return (
    <div className="bg-appBg text-textMain min-h-screen flex antialiased selection:bg-brandGreen selection:text-white font-sans w-full topo-bg-warm">
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
                  จัดการบอท
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF3EE] text-[#385241] border border-[#C9DCCF]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4E6955]"></span>
                  {botsData.length} บอทในระบบ
                </span>
              </div>
              <p className="text-xs text-textMuted mt-0.5 hidden sm:block">
                สร้าง ตั้งค่า และจัดการคลังความรู้ (Knowledge Base) สำหรับ AI Chatbot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary Action Button: + สร้างบอทใหม่ */}
            <Link
              href="/dashboard/bots/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ สร้างบอทใหม่</span>
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="bg-cardBg rounded-2xl border border-borderLight shadow-xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อบอท หรือรายละเอียด..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-borderLight rounded-xl text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] transition"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-textMuted font-mono">
                <Filter className="w-3.5 h-3.5" />
                <span>สถานะ:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-borderLight rounded-xl px-3 py-1.5 text-xs text-textMain focus:outline-none focus:ring-1 focus:ring-[#4E6955] shadow-2xs"
              >
                <option value="all">ทั้งหมด</option>
                <option value="active">ทำงาน (Active)</option>
                <option value="paused">หยุดชั่วคราว (Paused)</option>
              </select>

              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="bg-white border border-borderLight rounded-xl px-3 py-1.5 text-xs text-textMain focus:outline-none focus:ring-1 focus:ring-[#4E6955] shadow-2xs"
              >
                <option value="all">ทุกโมเดล</option>
                <option value="gemini">Gemini</option>
                <option value="gpt">GPT</option>
                <option value="claude">Claude</option>
              </select>
            </div>
          </div>

          {/* Bots Grid */}
          {!isLoaded ? (
            <div className="py-20 flex flex-col items-center justify-center text-textMuted">
              <Loader2 className="w-7 h-7 animate-spin text-[#4E6955] mb-2" />
              <p className="text-xs">กำลังโหลดข้อมูลแชทบอท...</p>
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="bg-cardBg rounded-2xl border border-dashed border-borderLight p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-textMain">
                  {searchQuery || statusFilter !== "all"
                    ? "ไม่พบบอทที่ตรงกับเงื่อนไขการค้นหา"
                    : "ยังไม่มีแชทบอทในระบบของคุณ"}
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  เริ่มต้นด้วยการสร้างบอทตัวแรกและอัปโหลดเอกสารความรู้จริงเข้าสู่ระบบ RAG
                </p>
              </div>
              <Link
                href="/dashboard/bots/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ สร้างบอทใหม่ตอนนี้</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-cardBg rounded-2xl border border-borderLight hover:border-[#C9DCCF] transition-all p-5 sm:p-6 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md group"
                >
                  <div className="space-y-3">
                    {/* Bot Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-textMain tracking-tight">
                            {bot.name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-500">
                            {bot.model}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <button
                        type="button"
                        onClick={() => toggleBotStatus(bot.id, bot.status)}
                        className="cursor-pointer"
                        title="คลิกเพื่อสลับสถานะ"
                      >
                        {bot.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            ทำงาน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            หยุดชั่วคราว
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Bot Description */}
                    <p className="text-xs text-textMuted line-clamp-2 leading-relaxed">
                      {bot.desc}
                    </p>
                  </div>

                  {/* Knowledge Stats & Actions */}
                  <div className="pt-3 border-t border-borderLight flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-[#385241] font-mono font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-[#4E6955]" />
                      <span>{bot.knowledgeCount || 0} เอกสารในคลัง</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenKnowledgeModal(bot)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-borderLight hover:border-[#4E6955] text-xs font-semibold text-textMain hover:text-[#4E6955] bg-white transition shadow-2xs cursor-pointer active:scale-95"
                    >
                      <span>จัดการคลังความรู้</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* REAL KNOWLEDGE BASE MANAGEMENT MODAL */}
      {managingBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-borderLight overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:px-6 bg-[#FAFBF9] border-b border-borderLight flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-textMain">
                      คลังความรู้ (Knowledge Base): {managingBot.name}
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {managingBot.model}
                    </span>
                  </div>
                  <p className="text-xs text-textMuted mt-0.5">
                    จัดการเอกสารข้อความและเวกเตอร์ RAG ที่ใช้สำหรับฝึกสอนแชทบอทตัวนี้
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManagingBot(null)}
                className="w-8 h-8 rounded-full border border-borderLight text-slate-400 hover:text-textMain flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center px-6 border-b border-borderLight gap-6 text-xs font-semibold font-mono">
              <button
                type="button"
                onClick={() => setModalTab("docs")}
                className={`py-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  modalTab === "docs"
                    ? "border-[#4E6955] text-[#385241]"
                    : "border-transparent text-textMuted hover:text-textMain"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>เอกสารทั้งหมด ({botDocuments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("upload")}
                className={`py-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  modalTab === "upload"
                    ? "border-[#4E6955] text-[#385241]"
                    : "border-transparent text-textMuted hover:text-textMain"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มเอกสารใหม่</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("test")}
                className={`py-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  modalTab === "test"
                    ? "border-[#4E6955] text-[#385241]"
                    : "border-transparent text-textMuted hover:text-textMain"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>ทดสอบค้นหาความรู้ (Vector Search Test)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: Document List */}
              {modalTab === "docs" && (
                <div>
                  {docsLoading ? (
                    <div className="py-16 text-center text-textMuted flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#4E6955] mb-2" />
                      <p className="text-xs">กำลังเรียกดูเอกสารในฐานข้อมูล...</p>
                    </div>
                  ) : botDocuments.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-borderLight rounded-2xl text-center space-y-3">
                      <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                      <div>
                        <p className="text-xs font-semibold text-textMain">บอทตัวนี้ยังไม่มีเอกสารความรู้</p>
                        <p className="text-[11px] text-textMuted mt-0.5">
                          คลิกแท็บ &quot;เพิ่มเอกสารใหม่&quot; ด้านบนเพื่อเพิ่มข้อมูลจริงให้บอท
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalTab("upload")}
                        className="px-4 py-2 bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold rounded-xl"
                      >
                        + เพิ่มเอกสารแรก
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-textMuted">
                        <span>แสดง {botDocuments.length} รายการเอกสารที่ประมวลผลแล้ว</span>
                        <span className="font-mono">
                          รวมเวกเตอร์: {botDocuments.reduce((sum, d) => sum + (d.chunkCount || 0), 0)} chunks
                        </span>
                      </div>

                      <div className="divide-y divide-borderLight border border-borderLight rounded-2xl overflow-hidden bg-white shadow-2xs">
                        {botDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center shrink-0 mt-0.5">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm text-textMain">
                                  {doc.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-textMuted font-mono">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 uppercase">
                                    {doc.fileType}
                                  </span>
                                  <span>ขนาด: {doc.fileSize || "ข้อความ"}</span>
                                  <span>•</span>
                                  <span className="text-[#385241] font-semibold">
                                    {doc.chunkCount} Chunks
                                  </span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-medium">
                                    สถานะ: {doc.status === "ready" ? "พร้อมใช้งาน" : "กำลังทำดัชนี"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id, doc.title)}
                              className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition cursor-pointer"
                              title="ลบเอกสารและเวกเตอร์"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Upload New Document */}
              {modalTab === "upload" && (
                <div className="space-y-4">
                  {/* File selector input */}
                  <div
                    onClick={() => modalFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#4E6955]/40 hover:border-[#4E6955] bg-[#FAFBF9] rounded-2xl p-6 text-center cursor-pointer transition"
                  >
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.markdown,.json,.csv,.faq,.html"
                      onChange={(e) => handleModalFileUpload(e.target.files)}
                    />
                    <UploadCloud className="w-6 h-6 text-[#4E6955] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[#385241]">
                      คลิกเพื่อเลือกไฟล์ข้อความ (TXT, MD, CSV, JSON)
                    </p>
                    <p className="text-[11px] text-textMuted mt-0.5">
                      ระบบจะอ่านเนื้อหาจริงและนำมาใส่ในฟอร์มด้านล่างโดยอัตโนมัติ
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleIngestDocument} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-medium text-textMain mb-1.5 font-mono uppercase tracking-wider">
                        ชื่อหัวข้อเอกสาร (Title) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="เช่น คู่มือการใช้งานระบบ, เงื่อนไขและนโยบายความเป็นส่วนตัว"
                        className="w-full bg-white border border-borderLight rounded-xl px-3.5 py-2.5 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955]"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-textMain mb-1.5 font-mono uppercase tracking-wider">
                        เนื้อหาความรู้แบบละเอียด (Document Content) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={uploadContent}
                        onChange={(e) => setUploadContent(e.target.value)}
                        placeholder="พิมพ์ วาง หรือเลือกไฟล์ข้อความที่ต้องการให้ระบบนำไปแบ่ง Chunk และคำนวณเวกเตอร์ 768 มิติ..."
                        className="w-full bg-white border border-borderLight rounded-xl p-3.5 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] resize-y"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setModalTab("docs")}
                        className="px-4 py-2 border border-borderLight rounded-xl text-textMuted hover:text-textMain"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingDoc}
                        className="px-5 py-2.5 bg-[#4E6955] hover:bg-[#3E5343] text-white rounded-xl font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {uploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{uploadingDoc ? "กำลังคำนวณเวกเตอร์และบันทึก..." : "นำเข้าสู่คลังความรู้"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: Semantic Search Test */}
              {modalTab === "test" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#FAFBF9] border border-borderLight space-y-3">
                    <p className="text-textMuted">
                      ทดสอบระบบ Vector RAG: พิมพ์คำถามหรือประโยคเพื่อดูว่าระบบดึง Chunks ข้อความใดจากคลังความรู้ขึ้นมาด้วยค่า Cosine Similarity สูงที่สุด
                    </p>

                    <form onSubmit={handleRunSearchTest} className="flex gap-2">
                      <input
                        type="text"
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        placeholder="พิมพ์คำถามทดสอบ เช่น นโยบายการคืนเงิน..."
                        className="flex-1 bg-white border border-borderLight rounded-xl px-3.5 py-2 text-xs text-textMain focus:outline-none focus:ring-1 focus:ring-[#4E6955]"
                      />
                      <button
                        type="submit"
                        disabled={testSearching}
                        className="px-4 py-2 bg-[#4E6955] hover:bg-[#3E5343] text-white rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                      >
                        {testSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>ค้นหา</span>
                      </button>
                    </form>
                  </div>

                  {testResults.length > 0 && (
                    <div className="space-y-3">
                      <p className="font-mono text-[11px] font-semibold text-textMain">
                        พบผลการค้นหา {testResults.length} Chunks ที่ตรงกับคำค้นหา:
                      </p>
                      <div className="space-y-2.5">
                        {testResults.map((result, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#385241]">
                                #{idx + 1} จากเอกสาร: {result.documentTitle}
                              </span>
                              <span className="font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                                ความเกี่ยวข้อง: {(result.similarity * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-textMain leading-relaxed font-mono bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                              {result.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-[#FAFBF9] border-t border-borderLight flex items-center justify-between text-xs text-textMuted">
              <span className="font-mono">
                Bot ID: {managingBot.id}
              </span>
              <button
                type="button"
                onClick={() => setManagingBot(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-textMain font-medium cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
