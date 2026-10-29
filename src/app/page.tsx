"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCachedUser, fetchCurrentUser, UserSessionData } from "@/lib/client-auth";

interface ChatMessage {
  sender: "bot" | "visitor";
  text: string;
}

export default function Home() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);

  // Active section state for indicator dots and nav
  const [activeSection, setActiveSection] = useState<
    "product" | "how-it-works" | "integration"
  >("product");

  useEffect(() => {
    setCurrentUser(getCachedUser());
    fetchCurrentUser().then((user) => {
      if (user) setCurrentUser(user);
    });

    const onAuthChange = () => {
      setCurrentUser(getCachedUser());
    };
    window.addEventListener("matcha_auth_change", onAuthChange);
    return () => window.removeEventListener("matcha_auth_change", onAuthChange);
  }, []);

  // Chat interactive demo state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Hi! Need help planning a trip? I'm happy to help!",
    },
    {
      sender: "visitor",
      text: "I'd like to change my check-in date",
    },
    {
      sender: "bot",
      text: "Sure thing — which date works better for you?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Snippet copy state
  const [copied, setCopied] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chat DOM references
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const snippetCode = `<script\n  src="https://cdn.nimbo.ai/widget.js"\n  data-bot-key="pk_live_8f2..."\n  defer><\/script>`;

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Intersection Observer to track active section for 3 full pages
  useEffect(() => {
    const sections = ["product", "how-it-works", "integration"];
    const observerOptions = {
      root: containerRef.current,
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id as "product" | "how-it-works" | "integration";
          if (sections.includes(id)) {
            setActiveSection(id);
          }
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCopyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippetCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = snippetCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      showToast("Snippet copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      showToast("Press Ctrl+C to copy snippet.");
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Add visitor message
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { sender: "visitor", text: trimmed },
    ];
    setMessages(updatedMessages);
    setInputText("");
    setIsTyping(true);

    // Auto-scroll to bottom
    setTimeout(() => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    }, 50);

    // Automated smart response
    setTimeout(() => {
      let reply = "I can definitely help with that! All docs are indexed and ready.";
      const lower = trimmed.toLowerCase();
      if (
        lower.includes("pricing") ||
        lower.includes("cost") ||
        lower.includes("plan")
      ) {
        reply = "AI Chaming starts free with 500 queries/month. No credit card required!";
      } else if (
        lower.includes("doc") ||
        lower.includes("pdf") ||
        lower.includes("file")
      ) {
        reply = "Simply drag & drop your PDF, Notion, or Markdown files into your dashboard.";
      } else if (lower.includes("hello") || lower.includes("hi")) {
        reply = "Hello there! How can I assist you today?";
      } else if (
        lower.includes("date") ||
        lower.includes("hotel") ||
        lower.includes("trip")
      ) {
        reply = "We have adjusted your travel inquiry. Which destination or date suits you best?";
      }

      setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
      setIsTyping(false);

      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 50);
    }, 650);
  };

  const focusHeroChat = () => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
      chatInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleStartNow = () => {
    if (currentUser) {
      router.push("/dashboard/bots");
    } else {
      showToast("Redirecting to onboarding flow...");
      setTimeout(() => {
        router.push("/register");
      }, 500);
    }
  };

  const handleTalkToUs = () => {
    showToast("Opening calendar booking modal...");
  };

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-y-auto snap-y-mandatory scroll-smooth topo-bg text-charcoal font-sans antialiased selection:bg-sage-300 selection:text-charcoal relative"
    >
      {/* Fixed Floating Header across all 3 pages */}
      <div className="fixed top-4 sm:top-6 left-0 right-0 z-40 px-4 sm:px-6 md:px-10 flex justify-center pointer-events-none">
        <header className="w-full max-w-6xl bg-[#FAFCFA]/90 backdrop-blur-md rounded-2xl border border-sage-200/80 px-6 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] pointer-events-auto">
          {/* Logo */}
          <button
            type="button"
            onClick={() => scrollToSection("product")}
            className="flex items-center space-x-2.5 group cursor-pointer text-left"
          >
            <div className="w-7 h-6 bg-[#6E9177] rounded flex items-center justify-center text-white text-xs shadow-sm transition-transform group-hover:scale-105">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <span className="font-mono font-bold text-sm tracking-tight text-charcoal">
              AI Chaming
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 font-mono text-xs tracking-wider">
            <button
              type="button"
              onClick={() => scrollToSection("product")}
              className={`transition-colors cursor-pointer ${
                activeSection === "product"
                  ? "text-sage-800 font-bold underline underline-offset-4 decoration-sage-500"
                  : "text-charcoal/75 hover:text-sage-700"
              }`}
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className={`transition-colors cursor-pointer ${
                activeSection === "how-it-works"
                  ? "text-sage-800 font-bold underline underline-offset-4 decoration-sage-500"
                  : "text-charcoal/75 hover:text-sage-700"
              }`}
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("integration")}
              className={`transition-colors cursor-pointer ${
                activeSection === "integration"
                  ? "text-sage-800 font-bold underline underline-offset-4 decoration-sage-500"
                  : "text-charcoal/75 hover:text-sage-700"
              }`}
            >
              Integration
            </button>
            {!currentUser && (
              <Link
                href="/login"
                className="text-charcoal/75 hover:text-sage-700 transition-colors"
              >
                Sign in
              </Link>
            )}
          </nav>

          {/* Right Action */}
          <div>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="font-mono text-xs px-4 py-1.5 rounded-full bg-[#6E9177] text-white hover:bg-[#587A60] transition duration-200 font-semibold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>ไปยังแดชบอร์ด</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <Link
                href="/register"
                className="font-mono text-xs px-5 py-1.5 rounded-full border border-sage-500/70 text-charcoal hover:bg-sage-500 hover:text-white transition duration-200 font-semibold inline-block"
              >
                Sign up
              </Link>
            )}
          </div>
        </header>
      </div>

      {/* Floating 3-Page Pagination Indicator Dots (Desktop) */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col space-y-3 bg-[#FAFCFA]/80 backdrop-blur-md p-2 rounded-full border border-sage-200/80 shadow-sm">
        <button
          type="button"
          onClick={() => scrollToSection("product")}
          title="Page 1: Product"
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            activeSection === "product"
              ? "bg-[#5B7963] scale-125"
              : "bg-sage-300 hover:bg-sage-400"
          }`}
          aria-label="Go to Product page"
        />
        <button
          type="button"
          onClick={() => scrollToSection("how-it-works")}
          title="Page 2: How it works"
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            activeSection === "how-it-works"
              ? "bg-[#5B7963] scale-125"
              : "bg-sage-300 hover:bg-sage-400"
          }`}
          aria-label="Go to How it works page"
        />
        <button
          type="button"
          onClick={() => scrollToSection("integration")}
          title="Page 3: Integration & Start"
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            activeSection === "integration"
              ? "bg-[#5B7963] scale-125"
              : "bg-sage-300 hover:bg-sage-400"
          }`}
          aria-label="Go to Integration page"
        />
      </div>

      {/* ========================================================
          PAGE 1: PRODUCT & HERO (Full Viewport Height)
         ======================================================== */}
      <section
        id="product"
        className="min-h-screen lg:h-screen snap-section flex flex-col justify-between items-center px-4 sm:px-6 md:px-10 pt-20 sm:pt-24 pb-6 sm:pb-8 w-full"
      >
        <div className="w-full max-w-6xl my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Hero Text Content */}
          <div className="lg:col-span-6 flex flex-col space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-100 border border-sage-200/80 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#6E9177] animate-pulse"></span>
              <span className="font-mono text-[11px] font-bold text-sage-800 uppercase tracking-wider">
                Instant Chatbot Setup
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] leading-[1.12] font-extrabold tracking-[-0.03em] text-charcoal">
              Give your website an AI chat that actually knows your business
            </h1>
            <p className="font-mono text-xs sm:text-sm text-charcoal/85 leading-relaxed">
              Upload your docs, get an API key, paste one line of script.{" "}
              <span className="font-bold text-charcoal">AI Chaming</span> turns
              your knowledge base into a chat widget your visitors can talk to
              &mdash; no engineering team required.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={currentUser ? "/dashboard" : "/register"}
                className="font-mono text-xs font-bold px-6 py-2.5 rounded-full bg-[#6E9177] text-white shadow-sm hover:bg-[#587A60] active:scale-[0.98] transition"
              >
                {currentUser ? "ไปยังแดชบอร์ด" : "Create your bot"}
              </Link>
              <button
                type="button"
                onClick={focusHeroChat}
                className="font-mono text-xs font-bold px-6 py-2.5 rounded-full bg-[#DCE5DD] text-[#344D3A] hover:bg-[#ccd8ce] active:scale-[0.98] transition cursor-pointer"
              >
                See it in action
              </button>
            </div>
          </div>

          {/* Right Hero Interactive Device/Card Mockup */}
          <div className="lg:col-span-6">
            <div className="bg-[#D9E3DB]/80 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-sage-200 shadow-[0_12px_32px_rgba(40,60,45,0.06)] grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
              {/* Mock Website Left Skeleton Structure */}
              <div className="col-span-4 flex flex-col justify-between py-2 pl-1 space-y-4">
                <div className="space-y-2">
                  <div className="h-2.5 w-16 bg-[#C2D1C5] rounded-full"></div>
                  <div className="h-2 w-24 bg-[#CCD8CE] rounded-full"></div>
                  <div className="h-2 w-20 bg-[#CCD8CE] rounded-full"></div>
                  <div className="h-2 w-28 bg-[#CCD8CE] rounded-full"></div>
                </div>

                <div className="space-y-2">
                  <div className="h-2 w-16 bg-[#CCD8CE] rounded-full"></div>
                  <div className="h-2 w-12 bg-[#CCD8CE] rounded-full"></div>
                </div>

                <div className="space-y-1.5 opacity-60">
                  <div className="h-1.5 w-10 bg-[#CCD8CE] rounded-full"></div>
                  <div className="h-1.5 w-14 bg-[#CCD8CE] rounded-full"></div>
                </div>
              </div>

              {/* Chat Widget Frame (Interactive demo right side) */}
              <div className="col-span-8 bg-[#F5F8F6] rounded-2xl border border-sage-200/90 shadow-sm flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="bg-[#5B7963] px-3.5 py-2.5 flex items-center justify-between text-white">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono font-bold">
                      S
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] font-bold tracking-tight flex items-center gap-1.5">
                        Smart Bot
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                      </span>
                    </div>
                  </div>
                  <span className="text-white/70 font-mono text-[11px] hover:text-white cursor-pointer select-none">
                    &bull;&bull;&bull;
                  </span>
                </div>

                {/* Messages Stream Area */}
                <div
                  ref={chatMessagesRef}
                  className="p-3 space-y-2 text-[11px] font-mono flex-1 overflow-y-auto max-h-[220px] custom-scrollbar"
                >
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${
                        msg.sender === "visitor"
                          ? "items-end w-full animate-fade-in"
                          : "items-start max-w-[90%]"
                      }`}
                    >
                      <div
                        className={
                          msg.sender === "visitor"
                            ? "bg-[#5F7D67] text-white px-3 py-2 rounded-2xl rounded-tr-sm leading-snug max-w-[85%] text-left"
                            : "bg-[#E7EEE9] text-charcoal px-3 py-2 rounded-2xl rounded-tl-sm leading-snug border border-sage-200/50"
                        }
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex flex-col items-start max-w-[90%]">
                      <div className="bg-[#E7EEE9] text-charcoal px-3 py-2 rounded-2xl rounded-tl-sm leading-snug border border-sage-200/50 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 bg-sage-500 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-sage-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-sage-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={handleSendChat}
                  className="p-2 border-t border-sage-200/60 bg-[#EAF0EC]/70 flex items-center space-x-1.5"
                >
                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder="Type a message..."
                    autoComplete="off"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-white/80 border border-sage-300/70 rounded-full px-3 py-1.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-sage-500 placeholder-stone-400"
                  />
                  <button
                    type="submit"
                    className="w-7 h-7 bg-[#5F7D67] hover:bg-[#4d6654] text-white rounded-full flex items-center justify-center transition shrink-0 cursor-pointer"
                    aria-label="Send message"
                  >
                    <svg
                      className="w-3.5 h-3.5 -rotate-45 ml-0.5 fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator to Page 2 */}
        <button
          type="button"
          onClick={() => scrollToSection("how-it-works")}
          className="flex flex-col items-center gap-1 font-mono text-[11px] text-charcoal/60 hover:text-sage-700 transition cursor-pointer pt-2 group"
        >
          <span>Explore how it works</span>
          <svg
            className="w-4 h-4 animate-bounce text-sage-600 group-hover:translate-y-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      </section>

      {/* ========================================================
          PAGE 2: HOW IT WORKS (Full Viewport Height)
         ======================================================== */}
      <section
        id="how-it-works"
        className="min-h-screen lg:h-screen snap-section flex flex-col justify-between items-center px-4 sm:px-6 md:px-10 pt-20 sm:pt-24 pb-6 sm:pb-8 w-full"
      >
        <div className="w-full max-w-6xl my-auto flex flex-col items-center text-center space-y-8 sm:space-y-10">
          <div className="space-y-3 max-w-xl">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-sage-800 font-bold block">
              How it works
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-charcoal">
              From zero to a working chatbot in three steps
            </h2>
            <p className="font-mono text-xs sm:text-[13px] text-charcoal/70">
              No code beyond one script tag. Everything else happens in your
              dashboard.
            </p>
          </div>

          {/* 3 Steps Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            {/* Step 1 */}
            <div className="bg-[#E7EFE9]/70 backdrop-blur-sm border border-sage-200/70 rounded-2xl p-6 sm:p-7 flex flex-col space-y-4 hover:border-sage-400/60 hover:shadow-md transition">
              <div className="w-8 h-8 rounded-lg bg-[#5F7D67] text-white font-mono font-bold flex items-center justify-center text-sm shadow-sm">
                1
              </div>
              <h3 className="font-extrabold text-base text-charcoal tracking-tight">
                Create your bot
              </h3>
              <p className="font-mono text-xs text-charcoal/75 leading-relaxed">
                Name it, set its personality with a system prompt, and lock it to
                your domain with an allowed-origins whitelist.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#E7EFE9]/70 backdrop-blur-sm border border-sage-200/70 rounded-2xl p-6 sm:p-7 flex flex-col space-y-4 hover:border-sage-400/60 hover:shadow-md transition">
              <div className="w-8 h-8 rounded-lg bg-[#5F7D67] text-white font-mono font-bold flex items-center justify-center text-sm shadow-sm">
                2
              </div>
              <h3 className="font-extrabold text-base text-charcoal tracking-tight">
                Upload your knowledge
              </h3>
              <p className="font-mono text-xs text-charcoal/75 leading-relaxed">
                Drop in PDFs, DOCX, or FAQ files. AI Chaming chunks and indexes
                everything automatically &mdash; watch status go from Processing to
                Ready.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#E7EFE9]/70 backdrop-blur-sm border border-sage-200/70 rounded-2xl p-6 sm:p-7 flex flex-col space-y-4 hover:border-sage-400/60 hover:shadow-md transition">
              <div className="w-8 h-8 rounded-lg bg-[#5F7D67] text-white font-mono font-bold flex items-center justify-center text-sm shadow-sm">
                3
              </div>
              <h3 className="font-extrabold text-base text-charcoal tracking-tight">
                Paste the script
              </h3>
              <p className="font-mono text-xs text-charcoal/75 leading-relaxed">
                Copy one line, add it to your site, and your widget goes live
                instantly in the bottom-right corner.
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator to Page 3 */}
        <button
          type="button"
          onClick={() => scrollToSection("integration")}
          className="flex flex-col items-center gap-1 font-mono text-[11px] text-charcoal/60 hover:text-sage-700 transition cursor-pointer pt-2 group"
        >
          <span>See integration & setup</span>
          <svg
            className="w-4 h-4 animate-bounce text-sage-600 group-hover:translate-y-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      </section>

      {/* ========================================================
          PAGE 3: INTEGRATION & CALL TO ACTION (Full Viewport Height)
         ======================================================== */}
      <section
        id="integration"
        className="min-h-screen lg:h-screen snap-section flex flex-col justify-between items-center px-4 sm:px-6 md:px-10 pt-20 sm:pt-24 pb-4 sm:pb-6 w-full"
      >
        <div className="w-full max-w-6xl my-auto flex flex-col space-y-6 sm:space-y-7">
          {/* Integration Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Integration Details */}
            <div className="lg:col-span-6 space-y-3 sm:space-y-4">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-sage-800 font-bold block">
                Integration
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">
                One script tag. That's the whole integration.
              </h2>
              <p className="font-mono text-xs sm:text-[13px] text-charcoal/75 leading-relaxed max-w-lg">
                Every bot ships with a unique key and a single snippet. Paste it
                before the closing body tag and you're done.
              </p>
            </div>

            {/* Right Code Box */}
            <div className="lg:col-span-6">
              <div className="relative bg-[#EAF0EC] border border-sage-200 rounded-2xl p-4 sm:p-5 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-sage-200/50">
                  <span className="font-mono text-[11px] text-sage-700 font-semibold tracking-wider">
                    HTML EMBED
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="font-mono text-[11px] px-2.5 py-1 rounded bg-white/70 hover:bg-white text-sage-800 border border-sage-300/80 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{copied ? "Copied!" : "Copy snippet"}</span>
                  </button>
                </div>

                <pre className="font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-charcoal">
                  <code>
                    <span className="text-[#205230] font-bold">&lt;script</span>
                    {"\n  "}
                    <span className="text-[#846816]">src</span>=
                    <span className="text-[#8B5A2B]">
                      &quot;https://cdn.nimbo.ai/widget.js&quot;
                    </span>
                    {"\n  "}
                    <span className="text-[#846816]">data-bot-key</span>=
                    <span className="text-[#8B5A2B]">
                      &quot;pk_live_8f2...&quot;
                    </span>
                    {"\n  "}
                    <span className="text-[#846816]">defer</span>
                    <span className="text-[#205230] font-bold">&gt;</span>
                    {"\n"}
                    <span className="text-[#205230] font-bold">
                      &lt;/script&gt;
                    </span>
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* Signup Banner */}
          <div className="w-full bg-[#74967C] rounded-3xl p-6 sm:p-9 text-center text-white flex flex-col items-center space-y-4 shadow-md border border-[#64846B]">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight max-w-2xl leading-tight">
              Your website already has visitors with questions
            </h2>
            <p className="font-mono text-xs sm:text-sm text-white/90 max-w-xl">
              Give them an answer in under five minutes of setup.
            </p>

            <div className="flex flex-wrap justify-center items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleStartNow}
                className="font-mono text-xs font-bold px-7 py-2.5 rounded-full bg-white text-[#3E5C45] hover:bg-stone-100 shadow-sm active:scale-95 transition cursor-pointer"
              >
                Start now
              </button>
              <button
                type="button"
                onClick={handleTalkToUs}
                className="font-mono text-xs font-bold px-7 py-2.5 rounded-full bg-white/20 border border-white/40 text-white hover:bg-white/30 active:scale-95 transition cursor-pointer"
              >
                Talk to us
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center font-mono text-[11px] text-charcoal/50 pt-2">
          &copy; 2026 AI Chaming. Built with pixel-accurate Tailwind CSS.
        </footer>
      </section>

      {/* Floating Notification Toast */}
      <div
        className={`fixed bottom-6 right-6 font-mono text-xs bg-charcoal text-white px-4 py-2.5 rounded-xl shadow-lg border border-white/10 transition-all duration-300 z-50 ${
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
