import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { encryptApiKey } from "../src/utils/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  const adminEmail = process.env.ADMIN_SEED_EMAIL || "4kungm4il.15243@gmail.com";

  // Upsert initial Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      name: "Super Admin",
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin user seeded: ${adminUser.email} (Role: ${adminUser.role})`);

  // Upsert demo standard user for development
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@user.local" },
    update: {},
    create: {
      email: "demo@user.local",
      name: "Demo Developer",
      role: Role.USER,
    },
  });
  console.log(`✅ Demo user seeded: ${demoUser.email} (Role: ${demoUser.role})`);

  // Default LLM models
  const defaultModels = [
    {
      provider: "google",
      displayName: "Antigravity Flash 3.8",
      modelIdentifier: "gemini-2.5-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: process.env.GEMINI_API_KEY || "",
    },
    {
      provider: "deepseek",
      displayName: "DeepSeek v4.1",
      modelIdentifier: "deepseek-chat",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    },
  ];

  for (const model of defaultModels) {
    const existing = await prisma.llmConfig.findFirst({
      where: {
        provider: model.provider,
        modelIdentifier: model.modelIdentifier,
      },
    });

    const encryptedApiKey = model.apiKey ? encryptApiKey(model.apiKey) : null;

    if (existing) {
      await prisma.llmConfig.update({
        where: { id: existing.id },
        data: {
          displayName: model.displayName,
          baseUrl: model.baseUrl,
          ...(encryptedApiKey ? { encryptedApiKey } : {}),
        },
      });
      console.log(`🔄 Updated LLM Config: ${model.displayName}`);
    } else {
      await prisma.llmConfig.create({
        data: {
          provider: model.provider,
          displayName: model.displayName,
          modelIdentifier: model.modelIdentifier,
          baseUrl: model.baseUrl,
          encryptedApiKey,
          isActive: true,
        },
      });
      console.log(`✨ Created LLM Config: ${model.displayName}`);
    }
  }

  console.log("🏁 Database seeding completed.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
