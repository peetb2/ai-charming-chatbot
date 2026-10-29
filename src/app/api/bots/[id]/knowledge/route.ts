import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chunkText, generateEmbedding, retrieveTopKChunks } from "@/lib/rag-engine";

const knowledgeIngestSchema = z.object({
  title: z.string().min(1, "Document title is required").max(200),
  content: z.string().min(1, "Document content is required"),
  fileType: z.string().default("text"),
  fileSize: z.string().optional(),
  sourceUrl: z.string().optional().nullable(),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/bots/[id]/knowledge - List all knowledge documents for a bot (or test search with ?query=)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: botId } = params;

  try {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId: session.userId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or access denied" }, { status: 404 });
    }

    const searchQuery = req.nextUrl.searchParams.get("query");
    let searchResults: any[] = [];

    if (searchQuery && searchQuery.trim()) {
      const queryEmbedding = await generateEmbedding(searchQuery.trim());
      searchResults = await retrieveTopKChunks(botId, queryEmbedding, 4, 0.2);
    }

    const documents = await prisma.knowledgeDocument.findMany({
      where: { botId },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        sourceUrl: doc.sourceUrl,
        chunkCount: doc._count.chunks,
        status: doc.status,
        createdAt: doc.createdAt,
      })),
      searchResults,
    });
  } catch (error: any) {
    console.error("[KM GET Error]", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch knowledge base" }, { status: 500 });
  }
}

// POST /api/bots/[id]/knowledge - Ingest document: chunk text and compute 768-dim embeddings (Flow A)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: botId } = params;

  try {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId: session.userId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or access denied" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parse = knowledgeIngestSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content, fileType, fileSize } = parse.data;

    // 1. Chunk content into semantic segments (Flow A Step 1)
    const textChunks = chunkText(content, 750, 120);

    if (textChunks.length === 0) {
      return NextResponse.json({ error: "Document content could not be parsed into chunks" }, { status: 400 });
    }

    // 2. Create the parent KnowledgeDocument record
    const document = await prisma.knowledgeDocument.create({
      data: {
        botId,
        title,
        fileType,
        fileSize: fileSize || `${(content.length / 1024).toFixed(1)} KB`,
        sourceUrl: parse.data.sourceUrl || null,
        chunkCount: textChunks.length,
        status: "indexing",
      },
    });

    // 3. Compute 768-dim embeddings via Google text-embedding-004 and store chunks (Flow A Step 2 & 3)
    const chunkCreations = await Promise.all(
      textChunks.map(async (chunkStr, idx) => {
        const embedding = await generateEmbedding(chunkStr);
        return prisma.knowledgeChunk.create({
          data: {
            documentId: document.id,
            botId,
            content: chunkStr,
            embedding: JSON.stringify(embedding),
            chunkIndex: idx,
          },
        });
      })
    );

    // 4. Mark document status as ready
    const updatedDoc = await prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: { status: "ready" },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: updatedDoc.id,
        title: updatedDoc.title,
        chunkCount: chunkCreations.length,
        status: updatedDoc.status,
      },
    });
  } catch (error: any) {
    console.error("[KM Ingestion Error]", error);
    return NextResponse.json({ error: error?.message || "Failed to ingest document" }, { status: 500 });
  }
}
