const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

function generateApiKey(type = "PUBLIC_WIDGET") {
  const prefix = type === "PUBLIC_WIDGET" ? "pk_live_" : "sk_live_";
  const randomBytesHex = crypto.randomBytes(24).toString("hex");
  const rawKey = `${prefix}${randomBytesHex}`;
  const keyPrefix = `${prefix}${randomBytesHex.substring(0, 7)}`;
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash, type };
}

async function main() {
  console.log("Seeding database...");

  // Check if admin user already exists
  let user = await prisma.user.findUnique({
    where: { email: "admin@matchachat.com" },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash("password123", 10);
    user = await prisma.user.create({
      data: {
        email: "admin@matchachat.com",
        passwordHash,
        creditBalance: 100,
      },
    });
    console.log("Created user:", user.email);
  }

  // Create an initial active Bot
  let bot = await prisma.bot.findFirst({
    where: { userId: user.id },
  });

  if (!bot) {
    bot = await prisma.bot.create({
      data: {
        userId: user.id,
        name: "Support Agent",
        systemPrompt: "คุณคือผู้ช่วย AI บริการลูกค้าของ MatchaChatbot ให้บริการตอบคำถามและคำแนะนำอย่างสุภาพและถูกต้อง",
        model: "gemini-1.5-flash",
        allowedDomains: "*",
        isActive: true,
      },
    });
    console.log("Created bot:", bot.name);

    // Create an API Key for this bot
    const keyData = generateApiKey("PUBLIC_WIDGET");
    const key = await prisma.apiKey.create({
      data: {
        botId: bot.id,
        userId: user.id,
        keyPrefix: keyData.keyPrefix,
        keyHash: keyData.keyHash,
        type: "PUBLIC_WIDGET",
        rateLimitPerMinute: 60,
      },
    });
    console.log("Created API Key prefix:", key.keyPrefix);
    console.log("RAW API KEY (Copy for widget):", keyData.rawKey);
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
