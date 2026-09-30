import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { id: string; docId: string };
}

// DELETE /api/bots/[id]/knowledge/[docId] - Delete a knowledge document and its vector chunks
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: botId, docId } = params;

  try {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId: session.userId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or access denied" }, { status: 404 });
    }

    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id: docId, botId },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Deleting the document cascades to its chunks
    await prisma.knowledgeDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true, message: "Document and vector chunks deleted" });
  } catch (error: any) {
    console.error("[KM DELETE Error]", error);
    return NextResponse.json({ error: error?.message || "Failed to delete document" }, { status: 500 });
  }
}
