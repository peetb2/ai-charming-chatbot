import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const botUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  model: z.string().optional(),
  allowedDomains: z.union([z.string(), z.array(z.string())]).optional().transform((v) => (v ? (Array.isArray(v) ? v.join(",") : v) : undefined)),
  websiteUrl: z.string().optional().nullable().or(z.literal("")),
  lastCrawledAt: z.union([z.string(), z.date()]).optional().nullable().transform((v) => (v ? new Date(v) : undefined)),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parse = botUpdateSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const bot = await prisma.bot.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const updatedBot = await prisma.bot.update({
      where: { id: params.id },
      data: parse.data,
    });

    return NextResponse.json({ success: true, bot: updatedBot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update bot" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = await prisma.bot.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  await prisma.bot.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
