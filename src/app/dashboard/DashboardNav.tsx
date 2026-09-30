"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Key, BarChart3 } from "lucide-react";

export default function DashboardNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "My Chatbots", href: "/dashboard/bots", icon: Bot },
    { name: "Integration & API Keys", href: "/dashboard/keys", icon: Key },
    { name: "Analytics & Credits", href: "/dashboard/analytics", icon: BarChart3 },
  ];

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-pill text-caption font-medium transition-all btn-press ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-ink-muted hover:text-ink hover:bg-canvas-parchment"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-ink-light"}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
