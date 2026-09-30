import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const botCreateSchema = z.object({
  name: z.string().min(1, "Bot name is required").max(100),
  systemPrompt: z.string().min(1, "System prompt is required"),
  model: z.string().default("gemini-1.5-flash"),
  allowedDomains: z.union([z.string(), z.array(z.string())]).default("*").transform((v) => Array.isArray(v) ? v.join(",") : v),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bots = await prisma.bot.findMany({
    where: { userId: session.userId },
    include: {
      apiKeys: {
        select: {
          id: true,
          keyPrefix: true,
          type: true,
          rateLimitPerMinute: true,
          createdAt: true,
        },
      },
      _count: {
        select: { usageLogs: true, knowledgeDocs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bots });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parse = botCreateSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const newBot = await prisma.bot.create({
      data: {
        userId: session.userId,
        ...parse.data,
      },
    });

    return NextResponse.json({ success: true, bot: newBot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create bot" }, { status: 500 });
  }
}
