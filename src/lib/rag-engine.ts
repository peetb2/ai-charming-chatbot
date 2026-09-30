import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 768-dimensional text chunker for RAG ingestion
 * Splits text into semantic chunks with overlap to preserve context across boundaries
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 750,
  overlap: number = 120
): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  if (cleaned.length <= maxChunkSize) {
    return [cleaned];
  }

  const chunks: string[] = [];
  const paragraphs = cleaned.split(/\n\s*\n/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;

    if ((currentChunk + "\n\n" + trimmedPara).length <= maxChunkSize) {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmedPara : trimmedPara;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If the paragraph itself is larger than maxChunkSize, split by sentences or words
      if (trimmedPara.length > maxChunkSize) {
        const sentences = trimmedPara.split(/(?<=[.!?。！？\n])\s+/);
        let subChunk = "";

        for (const sentence of sentences) {
          if ((subChunk + " " + sentence).length <= maxChunkSize) {
            subChunk = subChunk ? subChunk + " " + sentence : sentence;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = sentence;
          }
        }
        currentChunk = subChunk;
      } else {
        // Carry over overlap from previous chunk end
        const overlapSnippet = currentChunk.slice(-overlap);
        currentChunk = overlapSnippet ? `${overlapSnippet}...\n\n${trimmedPara}` : trimmedPara;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Deterministic fallback embedding generator (768-dim) for testing or offline environments
 */
function generateDeterministicEmbedding(text: string, dimensions = 768): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const vec: number[] = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    const val = Math.sin(hash + i * 13.37) * Math.cos(i);
    vec[i] = val;
  }
  // Normalize vector to unit length
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/**
 * Computes vector embedding using Google Gemini embedding models or deterministic fallback
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const isLiveKey = Boolean(
    GEMINI_API_KEY && 
    GEMINI_API_KEY.trim().length > 10 && 
    !GEMINI_API_KEY.includes("mock")
  );

  if (!isLiveKey) {
    return generateDeterministicEmbedding(text);
  }

  const embeddingCandidateModels = ["gemini-embedding-001", "gemini-embedding-2", "text-embedding-004"];

  for (const modelName of embeddingCandidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text);
      if (result.embedding && result.embedding.values && result.embedding.values.length > 0) {
        return result.embedding.values;
      }
    } catch (err: any) {
      // Continue to next embedding model
    }
  }

  console.warn("[Embedding Engine Warning] All live embedding models failed, using deterministic fallback.");
  return generateDeterministicEmbedding(text);
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export interface RetrievedChunk {
  id: string;
  documentTitle: string;
  content: string;
  similarity: number;
}

/**
 * Retrieves top-K context chunks for a bot based on cosine similarity
 */
export async function retrieveTopKChunks(
  botId: string,
  queryEmbedding: number[],
  topK: number = 4,
  minSimilarity: number = 0.45
): Promise<RetrievedChunk[]> {
  try {
    const chunks = await prisma.knowledgeChunk.findMany({
      where: { botId },
      include: {
        document: {
          select: { title: true },
        },
      },
    });

    if (chunks.length === 0) {
      return [];
    }

    const scored = chunks
      .map((chunk) => {
        let embeddingVec: number[] = [];
        try {
          if (chunk.embedding) {
            embeddingVec = JSON.parse(chunk.embedding);
          }
        } catch {
          embeddingVec = [];
        }

        const score = (embeddingVec.length > 0 && embeddingVec.length === queryEmbedding.length)
          ? cosineSimilarity(queryEmbedding, embeddingVec)
          : 0;

        return {
          id: chunk.id,
          documentTitle: chunk.document?.title || "เอกสารฐานความรู้",
          content: chunk.content,
          similarity: score,
        };
      })
      .filter((c) => c.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    // If strict threshold filtered out all chunks, check if there are moderately relevant chunks (>= 0.25)
    if (scored.length === 0) {
      const relaxed = chunks
        .map((chunk) => {
          let embeddingVec: number[] = [];
          try {
            if (chunk.embedding) {
              embeddingVec = JSON.parse(chunk.embedding);
            }
          } catch {
            embeddingVec = [];
          }

          const score = (embeddingVec.length > 0 && embeddingVec.length === queryEmbedding.length)
            ? cosineSimilarity(queryEmbedding, embeddingVec)
            : 0;

          return {
            id: chunk.id,
            documentTitle: chunk.document?.title || "เอกสารฐานความรู้",
            content: chunk.content,
            similarity: score,
          };
        })
        .filter((c) => c.similarity >= 0.25)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return relaxed;
    }

    return scored;
  } catch (error) {
    console.error("[Vector DB Retrieval Error]:", error);
    return [];
  }
}

/**
 * Synthesizes the RAG augmented prompt combining:
 * 1. Base bot system prompt & tone instructions
 * 2. Retrieved knowledge base context chunks
 * 3. User message
 *
 * Formatted clearly according to RAG specifications:
 * System: You are Support Agent for this website. Answer user inquiries naturally and accurately based strictly on the provided knowledge base context below. Do NOT simply acknowledge the question or repeat the prompt.
 * 
 * Context:
 * {retrieved_context}
 * 
 * User Question:
 * {user_message}
 */
export function synthesizeRagPrompt(
  systemPrompt: string,
  retrievedChunks: RetrievedChunk[],
  userMessage: string
): string {
  const baseInstruction = "You are Support Agent for this website. Answer user inquiries naturally and accurately based strictly on the provided knowledge base context below. Do NOT simply acknowledge the question or repeat the prompt.";
  
  const fullSystemInstruction = systemPrompt && systemPrompt.trim().length > 0
    ? `${baseInstruction}\n${systemPrompt.trim()}`
    : baseInstruction;

  let contextContent = "";
  if (retrievedChunks.length > 0) {
    contextContent = retrievedChunks
      .map((chunk, idx) => `[Document ${idx + 1}: ${chunk.documentTitle}]\n${chunk.content}`)
      .join("\n\n---\n\n");
  } else {
    contextContent = "No relevant documents found in knowledge base.";
  }

  return `System: ${fullSystemInstruction}

Context:
${contextContent}

User Question:
${userMessage}`;
}
