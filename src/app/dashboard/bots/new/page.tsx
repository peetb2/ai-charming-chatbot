"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { addStoredBot, BotItem } from "@/lib/bot-store";
import {
  FileText,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Sparkles,
  Loader2,
  Globe,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface UploadedFile {
  name: string;
  size: string;
  content: string;
  fileType: string;
  sourceUrl?: string;
}

export default function NewBotPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formBotName, setFormBotName] = useState("");
  const [formBotDesc, setFormBotDesc] = useState("");
  const [formBotModel, setFormBotModel] = useState("gemini-3.5-flash-lite");
  const [formBotTone, setFormBotTone] = useState("");
  
  // Real Uploaded Files (empty by default, no mocks!)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Knowledge Mode: "files" vs "crawl"
  const [knowledgeMode, setKnowledgeMode] = useState<"files" | "crawl">("files");

  // Website Crawling states
  const [inputWebsiteUrl, setInputWebsiteUrl] = useState("");
  const [crawlDepth, setCrawlDepth] = useState(2);
  const [crawlMaxPages, setCrawlMaxPages] = useState(15);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgressText, setCrawlProgressText] = useState("");
  const [crawlStats, setCrawlStats] = useState<{ discovered: number; crawled: number } | null>(null);
  const [crawledWebsiteUrl, setCrawledWebsiteUrl] = useState<string | null>(null);

  // Direct Text / FAQ Input
  const [showDirectTextInput, setShowDirectTextInput] = useState(false);
  const [directDocTitle, setDirectDocTitle] = useState("");
  const [directDocContent, setDirectDocContent] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    showToast("ลบเอกสารออกจากรายการแล้ว");
  };

  // Crawl website handler with streaming progress
  const handleCrawlWebsite = async () => {
    let targetUrl = inputWebsiteUrl.trim();
    if (!targetUrl) {
      showToast("กรุณาระบุ URL เว็บไซต์");
      return;
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
      setInputWebsiteUrl(targetUrl);
    }

    setIsCrawling(true);
    setCrawlProgressText("กำลังเชื่อมต่อเว็บไซต์และตรวจสอบโครงสร้าง...");
    setCrawlStats({ discovered: 1, crawled: 0 });

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          maxDepth: crawlDepth,
          maxPages: crawlMaxPages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บไซต์");
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completedData: any = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const event = JSON.parse(trimmed.slice(6));
                if (event.type === "progress") {
                  if (event.stage === "discovering") {
                    setCrawlProgressText(event.message || "กำลังค้นหาหน้าเว็บ...");
                    if (event.discoveredCount) {
                      setCrawlStats((prev) => ({
                        discovered: event.discoveredCount,
                        crawled: prev?.crawled || 0,
                      }));
                    }
                  } else if (event.stage === "crawling") {
                    const discovered = event.discoveredCount || 0;
                    const crawled = event.crawledCount || 0;
                    setCrawlStats({ discovered, crawled });
                    setCrawlProgressText(`กำลังอ่าน ${discovered} หน้า... (อ่านแล้ว ${crawled} หน้า)`);
                  } else if (event.stage === "indexing") {
                    setCrawlProgressText(event.message || "กำลังจัดเตรียมข้อมูล...");
                  }
                } else if (event.type === "completed") {
                  completedData = event;
                } else if (event.type === "error") {
                  throw new Error(event.error || "ดึงข้อมูลไม่สำเร็จ");
                }
              } catch (parseErr: any) {
                if (parseErr.message && !parseErr.message.includes("JSON")) {
                  throw parseErr;
                }
              }
            }
          }
        }
      }

      if (completedData && Array.isArray(completedData.pages) && completedData.pages.length > 0) {
        const newPages: UploadedFile[] = completedData.pages.map((p: any) => ({
          name: p.title || p.url,
          size: p.size || `${(p.charCount / 1024).toFixed(1)} KB`,
          content: p.content,
          fileType: "website",
          sourceUrl: p.url,
        }));

        setUploadedFiles((prev) => {
          const existingUrls = new Set(prev.map((f) => f.sourceUrl).filter(Boolean));
          const filteredNew = newPages.filter((p) => !existingUrls.has(p.sourceUrl));
          return [...prev, ...filteredNew];
        });

        setCrawledWebsiteUrl(completedData.rootUrl || targetUrl);
        showToast(`ดึงข้อมูลเว็บไซต์สำเร็จ! นำเข้า ${newPages.length} หน้าเว็บเข้าสู่รายการ`);
      } else {
        showToast("ไม่พบเนื้อหาข้อความบนเว็บไซต์ที่ระบุ กรุณาตรวจสอบ URL");
      }
    } catch (err: any) {
      console.error("[Crawl Website Error]", err);
      showToast(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บไซต์");
    } finally {
      setIsCrawling(false);
      setCrawlProgressText("");
      setCrawlStats(null);
    }
  };

  // Asynchronously read real file contents
  const handleAddFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const parsedFiles: UploadedFile[] = [];

    for (const file of files) {
      try {
        const textContent = await readFileContent(file);
        if (!textContent.trim()) {
          showToast(`ไฟล์ ${file.name} ว่างเปล่าหรือไม่มีข้อความ`);
          continue;
        }

        const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
        parsedFiles.push({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          content: textContent,
          fileType: ext,
        });
      } catch (err) {
        console.error(`Error reading ${file.name}:`, err);
        showToast(`ไม่สามารถอ่านเนื้อหาของไฟล์ ${file.name} ได้`);
      }
    }

    if (parsedFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...parsedFiles]);
      showToast(`โหลดเนื้อหา ${parsedFiles.length} ไฟล์เข้าสู่ฐานความรู้เรียบร้อย`);
    }
  };

  // Helper to read text from file
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve((e.target?.result as string) || "");
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, "UTF-8");
    });
  };

  // Add Direct Text Document
  const handleAddDirectText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directDocTitle.trim() || !directDocContent.trim()) {
      showToast("กรุณากรอกทั้งหัวข้อและเนื้อหาเอกสาร");
      return;
    }

    const newDoc: UploadedFile = {
      name: directDocTitle.trim(),
      size: `${(new Blob([directDocContent]).size / 1024).toFixed(1)} KB`,
      content: directDocContent.trim(),
      fileType: "text",
    };

    setUploadedFiles((prev) => [...prev, newDoc]);
    setDirectDocTitle("");
    setDirectDocContent("");
    setShowDirectTextInput(false);
    showToast(`เพิ่มเอกสารข้อความ "${newDoc.name}" เรียบร้อย`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBotName.trim()) {
      showToast("กรุณาระบุชื่อบอท");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatusText("กำลังบันทึกข้อมูลบอท...");

    try {
      // 1. Create Bot in Database
      const effectiveWebsiteUrl = crawledWebsiteUrl || (inputWebsiteUrl.trim() ? inputWebsiteUrl.trim() : null);
      const hasWebsiteDocs = uploadedFiles.some((f) => f.fileType === "website");

      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formBotName.trim(),
          systemPrompt: formBotTone.trim() || formBotDesc.trim() || "คุณคือผู้ช่วย AI อัจฉริยะสำหรับบริการลูกค้าและตอบคำถาม",
          model: formBotModel,
          allowedDomains: ["*"],
          websiteUrl: effectiveWebsiteUrl,
          lastCrawledAt: effectiveWebsiteUrl && hasWebsiteDocs ? new Date() : null,
          isActive: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "สร้างบอทไม่สำเร็จ");
      }

      const createdBotId = json.bot?.id;

      // 2. Ingest Real Knowledge Documents & Compute 768-dim Embeddings
      if (createdBotId && uploadedFiles.length > 0) {
        let currentIdx = 1;
        for (const file of uploadedFiles) {
          setSubmitStatusText(`กำลังคำนวณเวกเตอร์และดัชนีเอกสาร (${currentIdx}/${uploadedFiles.length}): ${file.name}...`);
          try {
            await fetch(`/api/bots/${createdBotId}/knowledge`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: file.name,
                content: file.content,
                fileType: file.fileType,
                fileSize: file.size,
                sourceUrl: file.sourceUrl || null,
              }),
            });
          } catch (docErr) {
            console.error(`Failed to ingest document ${file.name}:`, docErr);
          }
          currentIdx++;
        }
      }

      // 3. Save to local fallback store & Redirect
      const clientBotItem: BotItem = {
        id: createdBotId || `bot-${Date.now()}`,
        name: formBotName.trim(),
        desc: formBotDesc.trim() || formBotTone.trim() || "บอทผู้ช่วย AI",
        model: formBotModel,
        lastActive: "เพิ่งสร้างเมื่อสักครู่",
        status: "active",
        knowledgeCount: uploadedFiles.length,
        usageCount: 0,
        systemPrompt: formBotTone.trim() || formBotDesc.trim(),
        websiteUrl: effectiveWebsiteUrl,
        lastCrawledAt: effectiveWebsiteUrl && hasWebsiteDocs ? new Date().toISOString() : null,
      };
      addStoredBot(clientBotItem);

      showToast(`สร้างบอท "${formBotName.trim()}" พร้อมเอกสารความรู้ ${uploadedFiles.length} รายการสำเร็จ!`);

      setTimeout(() => {
        router.push("/dashboard/bots");
      }, 500);
    } catch (err: any) {
      console.error("[Create Bot Error]", err);
      showToast(err.message || "เกิดข้อผิดพลาดในการสร้างบอท");
      setIsSubmitting(false);
      setSubmitStatusText("");
    }
  };

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

            {/* Back Button */}
            <Link
              href="/dashboard/bots"
              className="w-9 h-9 rounded-xl bg-white border border-borderLight flex items-center justify-center text-slate-600 hover:text-[#4E6955] hover:border-[#4E6955]/40 transition shadow-xs cursor-pointer mr-1"
              title="กลับไปยังหน้ารายการบอท"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-textMain tracking-tight">
                  สร้างบอทใหม่
                </h1>
                <span className="text-[11px] font-medium bg-[#EBF3EE] text-[#385241] border border-[#C9DCCF] px-2 py-0.5 rounded-full">
                  Step 1 จาก 1
                </span>
              </div>
              <p className="text-xs text-textMuted mt-0.5 hidden sm:block">
                ออกแบบและตั้งค่าแชทบอทอัจฉริยะของคุณพร้อมคลังความรู้จริง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/bots"
              className="px-3.5 py-2 rounded-xl border border-borderLight bg-white text-xs font-semibold text-textMuted hover:text-textMain transition shadow-xs"
            >
              ยกเลิก / กลับ
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-8 max-w-4xl w-full mx-auto space-y-6 flex-1">
          <div className="bg-cardBg rounded-2xl border border-borderLight shadow-sm p-6 sm:p-8 space-y-7">
            <div className="flex items-center justify-between border-b border-borderLight pb-4">
              <div>
                <h2 className="text-base font-bold text-textMain tracking-tight">
                  ข้อมูลพื้นฐานและการฝึกสอนบอท
                </h2>
                <p className="text-xs text-textMuted mt-0.5">
                  กรอกรายละเอียดและอัปโหลดเอกสารจริงเข้าสู่ระบบ Vector RAG
                </p>
              </div>

              <Link
                href="/dashboard/bots"
                className="text-xs text-textMuted hover:text-[#4E6955] font-medium flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับสู่รายการบอท</span>
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ชื่อบอท */}
              <div>
                <label className="block text-xs font-semibold text-textMain mb-2 font-mono uppercase tracking-wider">
                  ชื่อบอท (Bot Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formBotName}
                  onChange={(e) => setFormBotName(e.target.value)}
                  placeholder="เช่น ชาร์มมิ่งซัพพอร์ต, ผู้ช่วยบริการลูกค้า"
                  className="w-full bg-white border border-borderLight rounded-xl px-4 py-3 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] transition shadow-xs"
                />
              </div>

              {/* คำอธิบายแชทบอท */}
              <div>
                <label className="block text-xs font-semibold text-textMain mb-2 font-mono uppercase tracking-wider">
                  คำอธิบายแชทบอท (Description) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formBotDesc}
                  onChange={(e) => setFormBotDesc(e.target.value)}
                  placeholder="ระบุวัตถุประสงค์ของบอท เช่น บอทสำหรับตอบคำถามนโยบาย สิทธิประโยชน์ และคู่มือการใช้งาน"
                  className="w-full bg-white border border-borderLight rounded-xl p-4 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] transition shadow-xs resize-none"
                />
              </div>

              {/* เลือกโมเดล AI */}
              <div>
                <label className="block text-xs font-semibold text-textMain mb-2 font-mono uppercase tracking-wider">
                  เลือกโมเดล AI (AI Model)
                </label>
                <div className="relative">
                  <select
                    value={formBotModel}
                    onChange={(e) => setFormBotModel(e.target.value)}
                    className="w-full appearance-none bg-white border border-borderLight rounded-xl px-4 py-3 text-xs text-textMain focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] transition shadow-xs cursor-pointer pr-10"
                  >
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (รวดเร็วสูงสุด, แนะนำสำหรับงานตอบแชทลูกค้า)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (โมเดลฉลาดล้ำสมัย, บริบทขนาดใหญ่)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (การวิเคราะห์เชิงลึก)</option>
                    <option value="gpt-4o-mini">GPT-4o mini (คล่องตัว แม่นยำ)</option>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-textMain font-mono uppercase tracking-wider">
                    ข้อมูลความรู้ (Knowledge Base)
                  </label>
                  {knowledgeMode === "files" && (
                    <button
                      type="button"
                      onClick={() => setShowDirectTextInput(!showDirectTextInput)}
                      className="text-xs text-[#4E6955] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showDirectTextInput ? "ปิดกล่องพิมพ์ข้อความ" : "หรือพิมพ์/วางข้อความโดยตรง"}</span>
                    </button>
                  )}
                </div>

                {/* Tabs: "อัปโหลดไฟล์ (Files)" vs "ดึงข้อมูลจากเว็บไซต์ (Website URL)" */}
                <div className="flex items-center gap-2 border-b border-borderLight mb-4 font-mono text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setKnowledgeMode("files")}
                    className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                      knowledgeMode === "files"
                        ? "border-[#4E6955] text-[#385241]"
                        : "border-transparent text-textMuted hover:text-textMain"
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>อัปโหลดไฟล์ (Files)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKnowledgeMode("crawl")}
                    className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                      knowledgeMode === "crawl"
                        ? "border-[#4E6955] text-[#385241]"
                        : "border-transparent text-textMuted hover:text-textMain"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>ดึงข้อมูลจากเว็บไซต์ (Website URL)</span>
                  </button>
                </div>

                {/* MODE 1: FILES */}
                {knowledgeMode === "files" && (
                  <>
                    {/* Direct Text / Q&A Input Box */}
                    {showDirectTextInput && (
                      <div className="mb-4 p-4 rounded-xl bg-[#FAFBF9] border border-[#C9DCCF] space-y-3">
                        <h4 className="text-xs font-bold text-[#385241] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>พิมพ์หรือวางเนื้อหาความรู้ / FAQ โดยตรง</span>
                        </h4>
                        <div>
                          <input
                            type="text"
                            value={directDocTitle}
                            onChange={(e) => setDirectDocTitle(e.target.value)}
                            placeholder="ชื่อเอกสาร (เช่น นโยบายการคืนเงินและเคลมสินค้า)"
                            className="w-full bg-white border border-borderLight rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:ring-1 focus:ring-[#4E6955]"
                          />
                        </div>
                        <div>
                          <textarea
                            rows={4}
                            value={directDocContent}
                            onChange={(e) => setDirectDocContent(e.target.value)}
                            placeholder="วางเนื้อหา ข้อมูล คู่มือ หรือรายการคำถาม-คำตอบ (FAQ) ที่ต้องการให้บอทเรียนรู้ที่นี่..."
                            className="w-full bg-white border border-borderLight rounded-lg p-3 text-xs text-textMain focus:outline-none focus:ring-1 focus:ring-[#4E6955] resize-y"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDirectTextInput(false)}
                            className="px-3 py-1.5 text-xs text-textMuted hover:text-textMain"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={handleAddDirectText}
                            className="px-4 py-1.5 rounded-lg bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold"
                          >
                            เพิ่มเข้าคลังความรู้
                          </button>
                        </div>
                      </div>
                    )}

                    {/* File Drop Area */}
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
                          ? "border-[#4E6955] bg-emerald-50"
                          : "border-[#4E6955]/40 bg-[#FAFBF9] hover:bg-[#F3F6F3]"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept=".txt,.md,.markdown,.json,.csv,.faq,.html"
                        onChange={(e) => {
                          if (e.target.files) handleAddFiles(e.target.files);
                        }}
                      />
                      <div className="w-12 h-12 rounded-full bg-[#EBF3EE] text-[#4E6955] flex items-center justify-center mb-3 group-hover:scale-105 transition shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-[#385241]">
                        ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์จากอุปกรณ์
                      </p>
                      <p className="text-[11px] text-textMuted mt-1">
                        รองรับไฟล์ข้อความจริง TXT, MD, Markdown, CSV, JSON, FAQ (อ่านและสกัดเวกเตอร์ทันที)
                      </p>
                    </div>
                  </>
                )}

                {/* MODE 2: WEBSITE CRAWLER */}
                {knowledgeMode === "crawl" && (
                  <div className="p-5 rounded-2xl bg-[#FAFBF9] border border-[#C9DCCF] space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#385241] mb-1.5">
                        ป้อน URL เว็บไซต์ (เช่น https://example.com)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Globe className="w-4 h-4" />
                          </div>
                          <input
                            type="url"
                            value={inputWebsiteUrl}
                            onChange={(e) => setInputWebsiteUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCrawlWebsite();
                              }
                            }}
                            placeholder="https://example.com"
                            className="w-full bg-white border border-borderLight rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] transition shadow-xs font-mono"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleCrawlWebsite}
                          disabled={isCrawling || !inputWebsiteUrl.trim()}
                          className="px-5 py-2.5 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 shrink-0"
                        >
                          {isCrawling ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                          <span>{isCrawling ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลอัตโนมัติ (Crawl Website)"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Advanced Crawl Settings */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-textMuted font-mono">
                      <div className="flex items-center gap-1.5">
                        <span>ความลึกการค้นหา (Max Depth):</span>
                        <select
                          value={crawlDepth}
                          onChange={(e) => setCrawlDepth(Number(e.target.value))}
                          disabled={isCrawling}
                          className="bg-white border border-borderLight rounded-lg px-2 py-1 text-[11px] text-textMain"
                        >
                          <option value={1}>1 (เฉพาะหน้าแรก)</option>
                          <option value={2}>2 (หน้าแรก + ลิงก์ภายในหลัก - แนะนำ)</option>
                          <option value={3}>3 (เจาะลึก 3 ระดับ)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span>จำนวนหน้าสูงสุด (Max Pages):</span>
                        <select
                          value={crawlMaxPages}
                          onChange={(e) => setCrawlMaxPages(Number(e.target.value))}
                          disabled={isCrawling}
                          className="bg-white border border-borderLight rounded-lg px-2 py-1 text-[11px] text-textMain"
                        >
                          <option value={5}>5 หน้า</option>
                          <option value={10}>10 หน้า</option>
                          <option value={15}>15 หน้า (แนะนำ)</option>
                          <option value={30}>30 หน้า</option>
                        </select>
                      </div>
                    </div>

                    {/* Loading progress indicator */}
                    {isCrawling && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-pulse">
                        <div className="flex items-center gap-2.5">
                          <Loader2 className="w-4 h-4 text-[#4E6955] animate-spin shrink-0" />
                          <p className="text-xs font-bold font-mono">
                            {crawlProgressText || (crawlStats ? `กำลังอ่าน ${crawlStats.discovered} หน้า...` : "กำลังเริ่มดึงข้อมูล...")}
                          </p>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          ระบบกำลังสกัดเนื้อหา ทำความสะอาด HTML ตัด Navbar/Footer/โฆษณา และแปลงเป็น Markdown โดยอัตโนมัติ
                        </p>
                      </div>
                    )}

                    {/* Crawled Success Banner */}
                    {crawledWebsiteUrl && !isCrawling && (
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            ดึงข้อมูลจาก <strong>{crawledWebsiteUrl}</strong> สำเร็จ! เนื้อหาถูกเพิ่มลงในรายการด้านล่างแล้ว
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCrawlWebsite()}
                          className="text-[11px] font-semibold text-[#4E6955] hover:underline shrink-0 ml-2"
                        >
                          ดึงใหม่อีกครั้ง
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Real Uploaded / Crawled Files Chips */}
                {uploadedFiles.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-mono text-textMuted font-medium">
                        เอกสารที่พร้อมประมวลผล ({uploadedFiles.length} รายการ):
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        เว็บ: {uploadedFiles.filter((f) => f.fileType === "website").length} • ไฟล์:{" "}
                        {uploadedFiles.filter((f) => f.fileType !== "website").length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white border border-[#D5DFD8] p-3 rounded-xl text-xs text-textMain shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                file.fileType === "website"
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-[#EBF3EE] text-[#4E6955]"
                              }`}
                            >
                              {file.fileType === "website" ? (
                                <Globe className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold truncate">{file.name}</p>
                                {file.fileType === "website" && (
                                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 shrink-0">
                                    Website
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-textMuted font-mono truncate">
                                {file.sourceUrl ? file.sourceUrl : `ขนาด ${file.size} • ${file.content.length} ตัวอักษร`}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeUploadedFile(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer shrink-0 ml-2"
                            title="ลบเอกสารนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400 italic">
                    * ยังไม่มีเอกสารในรายการ คุณสามารถเพิ่มไฟล์หรือระบุ URL เพื่อดึงข้อมูลอัตโนมัติได้
                  </p>
                )}
              </div>

              {/* ตั้งค่า Personality / Tone */}
              <div>
                <label className="block text-xs font-semibold text-textMain mb-2 font-mono uppercase tracking-wider">
                  คำแนะนำและบุคลิกของบอท (System Prompt / Tone)
                </label>
                <textarea
                  rows={3}
                  value={formBotTone}
                  onChange={(e) => setFormBotTone(e.target.value)}
                  placeholder="เช่น คุณคือผู้ช่วยบริการลูกค้าอย่างสุภาพ ตอบคำถามโดยอ้างอิงจากข้อมูลความรู้ที่ให้ไว้เป็นหลัก หากไม่แน่ใจให้ตอบตามจริงและแนะนำให้ติดต่อทีมงาน"
                  className="w-full bg-white border border-borderLight rounded-xl p-4 text-xs text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4E6955]/20 focus:border-[#4E6955] transition shadow-xs resize-none"
                />
              </div>

              {/* Progress notice when submitting */}
              {isSubmitting && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 text-[#4E6955] animate-spin shrink-0" />
                  <div>
                    <p className="font-bold">{submitStatusText || "กำลังประมวลผล..."}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      ระบบกำลังสกัด Chunk และคำนวณเวกเตอร์ 768 มิติสำหรับเอกสารความรู้
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Form Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-borderLight">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => router.push("/dashboard/bots")}
                  className="px-5 py-2.5 rounded-xl border border-borderLight text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#4E6955] hover:bg-[#3E5343] text-white text-xs font-semibold shadow-md shadow-emerald-950/10 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? "กำลังบันทึกและเวกเตอร์..." : "สร้างบอท"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
