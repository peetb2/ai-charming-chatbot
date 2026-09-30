import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      creditBalance: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const botCount = await prisma.bot.count({
    where: { userId: session.userId },
  });

  const totalLogs = await prisma.usageLog.count({
    where: {
      bot: { userId: session.userId },
    },
  });

  const recentLogs = await prisma.usageLog.findMany({
    where: {
      bot: { userId: session.userId },
    },
    include: {
      bot: { select: { name: true } },
      apiKey: { select: { keyPrefix: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 14-day window for daily stats
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const logsInWindow = await prisma.usageLog.findMany({
    where: {
      bot: { userId: session.userId },
      createdAt: { gte: fourteenDaysAgo },
    },
    select: { createdAt: true },
  });

  const dailyMap: Record<string, number> = {};
  for (const log of logsInWindow) {
    const dateKey = log.createdAt.toISOString().slice(0, 10);
    dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;
  }

  const dailyStats = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    const count = dailyMap[key] || 0;
    dailyStats.push({
      date: label,
      total: count,
      success: count,
    });
  }

  return NextResponse.json({
    creditBalance: user.creditBalance,
    totalBots: botCount,
    totalMessages: totalLogs,
    dailyStats,
    logs: recentLogs,
  });
}
