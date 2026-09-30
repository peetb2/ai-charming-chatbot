import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyApiKey, isDomainAllowed } from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";
import { generateEmbedding, retrieveTopKChunks, synthesizeRagPrompt } from "@/lib/rag-engine";

// Zod schema for payload validation
const chatRequestSchema = z.object({
  publicKey: z.string().min(1, "publicKey is required"),
  message: z.string().min(1, "message cannot be empty").max(4000, "message is too long"),
  sessionId: z.string().optional(),
});

// Helper for CORS response headers
function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// OPTIONS preflight handler
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || undefined;
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// POST handler for widget chat
export async function POST(req: NextRequest) {
  const originHeader = req.headers.get("origin") || req.headers.get("referer") || undefined;

  try {
    const jsonBody = await req.json().catch(() => ({}));
    
    // 1. Zod input validation
    const validationResult = chatRequestSchema.safeParse(jsonBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders(originHeader) }
      );
    }

    const { publicKey, message } = validationResult.data;

    // 2. Validate API key against DB & active status
    const keyVerification = await verifyApiKey(publicKey, { originDomain: originHeader });
    if (!keyVerification.valid) {
      const statusCode = keyVerification.errorCode === "DOMAIN_NOT_ALLOWED" ? 403 : 401;
      return NextResponse.json(
        {
          error: keyVerification.errorMessage,
          code: keyVerification.errorCode,
        },
        { status: statusCode, headers: corsHeaders(originHeader) }
      );
    }

    const { bot, apiKey, user } = keyVerification;

    // 3. Quota check: user credit balance
    if (user.creditBalance <= 0) {
      return NextResponse.json(
        {
          error: "Insufficient credits. The chatbot owner has exhausted their credit balance.",
          code: "CREDITS_EXHAUSTED",
        },
        { status: 429, headers: corsHeaders(originHeader) }
      );
    }

    // 4. Flow B: Vectorize User Query & Retrieve Top-K Context Chunks from Vector DB
    const queryEmbedding = await generateEmbedding(message);
    const retrievedChunks = await retrieveTopKChunks(bot.id, queryEmbedding, 4, 0.45);

    // 5. Synthesize Combined Prompt (System Instruction + KM Context + User Query)
    const combinedPrompt = synthesizeRagPrompt(bot.systemPrompt || "คุณคือผู้ช่วย AI อัจฉริยะ", retrievedChunks, message);

    // 6. Call LLM provider (Google Gemini) with resilient model fallback
    let replyText = "";
    let promptTokens = combinedPrompt.length;
    let completionTokens = 0;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      console.error("[LLM Error] Missing GEMINI_API_KEY environment variable");
      return NextResponse.json(
        {
          error: "Chat service configuration error: GEMINI_API_KEY is missing.",
          code: "CONFIG_ERROR",
        },
        { status: 500, headers: corsHeaders(originHeader) }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // List candidate models to ensure reliable execution (preventing 404 deprecated models or temporary 503 high demand spikes)
    const candidateModels = [
      bot.model,
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
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
        { status: 502, headers: corsHeaders(originHeader) }
      );
    }

    // 7. Transaction: Deduct 1 credit & log usage in database
    const [updatedUser, usageLog] = await prisma.$transaction([
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
          originDomain: originHeader || "direct",
        },
      }),
    ]);

    // 8. Return success response with sources & credits
    return NextResponse.json(
      {
        reply: replyText,
        creditsRemaining: updatedUser.creditBalance,
        botName: bot.name,
        sources: retrievedChunks.map((c) => ({
          title: c.documentTitle,
          relevance: Number((c.similarity * 100).toFixed(1)),
        })),
      },
      { status: 200, headers: corsHeaders(originHeader) }
    );

  } catch (error: any) {
    console.error("[API Gateway Error]", error);
    return NextResponse.json(
      {
        error: "Internal server error occurred while processing message.",
        details: error?.message,
      },
      { status: 500, headers: corsHeaders(originHeader) }
    );
  }
}
