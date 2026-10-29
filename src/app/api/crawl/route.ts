import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crawlWebsite, CrawlProgressEvent } from "@/lib/crawler";
import { chunkText, generateEmbedding } from "@/lib/rag-engine";

const crawlSchema = z.object({
  url: z.string().url("กรุณาระบุ URL เว็บไซต์ที่ถูกต้อง (เช่น https://example.com)"),
  maxDepth: z.number().int().min(1).max(4).optional().default(2),
  maxPages: z.number().int().min(1).max(50).optional().default(15),
  botId: z.string().optional(),
  reSync: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    const body = await req.json().catch(() => ({}));
    const parse = crawlSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { url, maxDepth, maxPages, botId, reSync, stream } = parse.data;

    // Verify bot ownership if botId is provided
    let targetBot: any = null;
    if (botId) {
      targetBot = await prisma.bot.findFirst({
        where: session ? { id: botId, userId: session.userId } : { id: botId },
      });

      if (!targetBot) {
        return NextResponse.json(
          { error: "ไม่พบบอทเป้าหมายหรือไม่มีสิทธิ์เข้าถึง" },
          { status: 404 }
        );
      }
    }

    // 1. Streaming response for real-time progress feedback
    if (stream) {
      const responseStream = new TransformStream();
      const writer = responseStream.writable.getWriter();
      const encoder = new TextEncoder();

      const sendEvent = async (data: any) => {
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client might have disconnected
        }
      };

      // Run crawl asynchronously in background pipeline
      (async () => {
        try {
          const crawlResult = await crawlWebsite({
            url,
            maxDepth,
            maxPages,
            onProgress: async (prog: CrawlProgressEvent) => {
              await sendEvent({
                type: "progress",
                ...prog,
              });
            },
          });

          // Ingest into Bot Knowledge Base if botId provided
          let documentsCreated = 0;
          let totalChunks = 0;

          if (botId && targetBot) {
            await sendEvent({
              type: "progress",
              stage: "indexing",
              message: `กำลังแปลงข้อความเป็นเวกเตอร์ 768 มิติสำหรับ ${crawlResult.pages.length} หน้าเว็บ...`,
              discoveredCount: crawlResult.totalPagesDiscovered,
              crawledCount: crawlResult.pagesCrawled,
            });

            if (reSync) {
              // Delete existing website documents for clean re-sync
              await prisma.knowledgeDocument.deleteMany({
                where: { botId, fileType: "website" },
              });
            }

            for (let i = 0; i < crawlResult.pages.length; i++) {
              const page = crawlResult.pages[i];
              const textChunks = chunkText(page.content, 750, 120);

              const document = await prisma.knowledgeDocument.create({
                data: {
                  botId,
                  title: page.title || page.url,
                  fileType: "website",
                  fileSize: page.size,
                  sourceUrl: page.url,
                  chunkCount: textChunks.length,
                  status: "indexing",
                },
              });

              for (let cIdx = 0; cIdx < textChunks.length; cIdx++) {
                const chunkStr = textChunks[cIdx];
                const embedding = await generateEmbedding(chunkStr);
                await prisma.knowledgeChunk.create({
                  data: {
                    documentId: document.id,
                    botId,
                    content: chunkStr,
                    embedding: JSON.stringify(embedding),
                    chunkIndex: cIdx,
                  },
                });
              }

              await prisma.knowledgeDocument.update({
                where: { id: document.id },
                data: { status: "ready" },
              });

              documentsCreated++;
              totalChunks += textChunks.length;
            }

            // Update bot's root URL and last crawled timestamp
            await prisma.bot.update({
              where: { id: botId },
              data: {
                websiteUrl: crawlResult.rootUrl,
                lastCrawledAt: new Date(),
              },
            });
          }

          await sendEvent({
            type: "completed",
            success: true,
            rootUrl: crawlResult.rootUrl,
            totalPagesDiscovered: crawlResult.totalPagesDiscovered,
            pagesCrawled: crawlResult.pagesCrawled,
            documentsCreated,
            totalChunks,
            pages: crawlResult.pages,
          });
        } catch (err: any) {
          console.error("[Crawl Stream Error]", err);
          await sendEvent({
            type: "error",
            error: err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บไซต์",
          });
        } finally {
          await writer.close();
        }
      })();

      return new Response(responseStream.readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // 2. Standard JSON Response (non-streamed)
    const crawlResult = await crawlWebsite({
      url,
      maxDepth,
      maxPages,
    });

    let documentsCreated = 0;
    let totalChunks = 0;
    let updatedBot: any = null;

    if (botId && targetBot) {
      if (reSync) {
        await prisma.knowledgeDocument.deleteMany({
          where: { botId, fileType: "website" },
        });
      }

      for (const page of crawlResult.pages) {
        const textChunks = chunkText(page.content, 750, 120);

        const document = await prisma.knowledgeDocument.create({
          data: {
            botId,
            title: page.title || page.url,
            fileType: "website",
            fileSize: page.size,
            sourceUrl: page.url,
            chunkCount: textChunks.length,
            status: "indexing",
          },
        });

        for (let cIdx = 0; cIdx < textChunks.length; cIdx++) {
          const chunkStr = textChunks[cIdx];
          const embedding = await generateEmbedding(chunkStr);
          await prisma.knowledgeChunk.create({
            data: {
              documentId: document.id,
              botId,
              content: chunkStr,
              embedding: JSON.stringify(embedding),
              chunkIndex: cIdx,
            },
          });
        }

        await prisma.knowledgeDocument.update({
          where: { id: document.id },
          data: { status: "ready" },
        });

        documentsCreated++;
        totalChunks += textChunks.length;
      }

      updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: {
          websiteUrl: crawlResult.rootUrl,
          lastCrawledAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      rootUrl: crawlResult.rootUrl,
      totalPagesDiscovered: crawlResult.totalPagesDiscovered,
      pagesCrawled: crawlResult.pagesCrawled,
      documentsCreated,
      totalChunks,
      bot: updatedBot,
      pages: crawlResult.pages,
    });
  } catch (error: any) {
    console.error("[Crawl API Error]", error);
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บไซต์" },
      { status: 500 }
    );
  }
}
