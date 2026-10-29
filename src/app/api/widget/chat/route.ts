import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";
import { generateEmbedding, retrieveTopKChunks, synthesizeRagPrompt } from "@/lib/rag-engine";

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || undefined;
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") || req.headers.get("referer") || undefined;
  try {
    const body = await req.json().catch(() => ({}));
    const key = body.botKey || body.publicKey || body.apiKey;
    const message = body.message;

    if (!key || !message) {
      return NextResponse.json(
        { error: "botKey (or publicKey) and message are required" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Verify key, CORS domain, and active status
    const verification = await verifyApiKey(key, { originDomain: origin });
    if (!verification.valid) {
      const statusCode = verification.errorCode === "DOMAIN_NOT_ALLOWED" ? 403 : 401;
      return NextResponse.json(
        {
          error: verification.errorMessage,
          code: verification.errorCode,
        },
        { status: statusCode, headers: corsHeaders(origin) }
      );
    }

    const { bot, apiKey, user } = verification;

    // Check credits
    if (user.creditBalance <= 0) {
      return NextResponse.json(
        {
          error: "Insufficient credits. The chatbot owner has exhausted their credit balance.",
          code: "CREDITS_EXHAUSTED",
        },
        { status: 429, headers: corsHeaders(origin) }
      );
    }

    // Retrieve knowledge base chunks
    const queryEmbedding = await generateEmbedding(message);
    const retrievedChunks = await retrieveTopKChunks(bot.id, queryEmbedding, 4, 0.45);

    // Synthesize RAG prompt
    const combinedPrompt = synthesizeRagPrompt(bot.systemPrompt || "คุณคือผู้ช่วย AI อัจฉริยะ", retrievedChunks, message);

    // Call LLM provider (Google Gemini)
    let replyText = "";
    let promptTokens = combinedPrompt.length;
    let completionTokens = 0;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      console.error("[LLM Error] Missing GEMINI_API_KEY environment variable");
      return NextResponse.json(
        { error: "Chat service configuration error: GEMINI_API_KEY is missing." },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const activeBotModel =
      bot.model === "gemini-1.5-flash" || bot.model === "gemini-2.5-flash-lite"
        ? "gemini-3.5-flash-lite"
        : bot.model === "gemini-1.5-pro"
        ? "gemini-3.8-flash"
        : bot.model || "gemini-3.5-flash-lite";

    const candidateModels = [
      activeBotModel,
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash",
    ].filter((m): m is string => Boolean(m && m.trim().length > 0));

    const uniqueModels = Array.from(new Set(candidateModels));
    let lastLlmError: any = null;

    for (const modelName of uniqueModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(combinedPrompt);
        const candidateReply = result.response.text();
        if (candidateReply && candidateReply.trim().length > 0) {
          replyText = candidateReply.trim();
          completionTokens = replyText.length;
          break;
        }
      } catch (err: any) {
        lastLlmError = err;
        console.warn(`[LLM Model ${modelName} Warning]:`, err?.message || err);
      }
    }

    if (!replyText) {
      console.error("[LLM Failure] All candidate Gemini models failed to generate content:", lastLlmError);
      return NextResponse.json(
        {
          error: "ขออภัยครับ ขณะนี้ระบบประมวลผลข้อความขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
          details: lastLlmError?.message || "LLM execution failure",
        },
        { status: 502, headers: corsHeaders(origin) }
      );
    }

    // Deduct 1 credit & record usage
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { creditBalance: { decrement: 1 } },
      }),
      prisma.usageLog.create({
        data: {
          botId: bot.id,
          apiKeyId: apiKey.id,
          messageCount: 1,
          promptTokens: promptTokens,
          completionTokens: completionTokens,
          originDomain: origin || "direct",
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        reply: replyText,
        botName: bot.name,
        remainingCredits: updatedUser.creditBalance,
        creditsRemaining: updatedUser.creditBalance,
        sources: retrievedChunks.map((c) => ({
          title: c.documentTitle,
          relevance: Number((c.similarity * 100).toFixed(1)),
        })),
      },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (error: any) {
    console.error("[Widget Chat API Error]", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
