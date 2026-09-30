import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { generateApiKey, KeyType } from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";

const keyCreateSchema = z.object({
  botId: z.string().min(1, "botId is required"),
  type: z.enum(["PUBLIC_WIDGET", "SECRET_SERVER"]).default("PUBLIC_WIDGET"),
  rateLimitPerMinute: z.number().int().min(1).max(1000).default(60),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: session.userId },
    include: {
      bot: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Exclude keyHash for privacy
  const sanitizedKeys = apiKeys.map((k) => ({
    id: k.id,
    botId: k.botId,
    botName: k.bot.name,
    keyPrefix: k.keyPrefix,
    type: k.type,
    rateLimitPerMinute: k.rateLimitPerMinute,
    createdAt: k.createdAt,
  }));

  return NextResponse.json({ apiKeys: sanitizedKeys });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parse = keyCreateSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { botId, type, rateLimitPerMinute } = parse.data;

    // Verify bot belongs to user
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId: session.userId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or unauthorized" }, { status: 404 });
    }

    // Generate raw key and SHA-256 hash
    const generated = generateApiKey(type as KeyType);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        botId,
        userId: session.userId,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        type: type as KeyType,
        rateLimitPerMinute,
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKeyRecord.id,
        keyPrefix: apiKeyRecord.keyPrefix,
        type: apiKeyRecord.type,
        rateLimitPerMinute: apiKeyRecord.rateLimitPerMinute,
        createdAt: apiKeyRecord.createdAt,
      },
      // Raw key returned ONCE to the user to copy
      rawKey: generated.rawKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to generate key" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "Key ID required" }, { status: 400 });
  }

  const keyRecord = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: session.userId },
  });

  if (!keyRecord) {
    return NextResponse.json({ error: "API Key not found" }, { status: 404 });
  }

  await prisma.apiKey.delete({
    where: { id: keyId },
  });

  return NextResponse.json({ success: true });
}
