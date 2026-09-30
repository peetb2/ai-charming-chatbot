import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { generateApiKey, KeyType } from "@/lib/api-keys";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parse = registerSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parse.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User (50 default free credits)
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        creditBalance: 50,
      },
    });

    // Create a default Bot for the user
    const defaultBot = await prisma.bot.create({
      data: {
        userId: newUser.id,
        name: "Customer Support Bot",
        systemPrompt: "You are a helpful customer support AI assistant for our website.",
        model: "gemini-1.5-flash",
        allowedDomains: "*",
        isActive: true,
      },
    });

    // Generate initial API key for the default bot
    const keyData = generateApiKey(KeyType.PUBLIC_WIDGET);
    await prisma.apiKey.create({
      data: {
        botId: defaultBot.id,
        userId: newUser.id,
        keyPrefix: keyData.keyPrefix,
        keyHash: keyData.keyHash,
        type: KeyType.PUBLIC_WIDGET,
        rateLimitPerMinute: 60,
      },
    });

    // Create JWT Session Token
    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: newUser.id, email: newUser.email, creditBalance: newUser.creditBalance },
      initialRawKey: keyData.rawKey,
    });

    response.cookies.set("matcha_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Register Error]", error);
    return NextResponse.json(
      { error: "Failed to register user", details: error?.message },
      { status: 500 }
    );
  }
}
