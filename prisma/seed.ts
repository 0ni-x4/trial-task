import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create a mock user
  const user = await prisma.user.create({
    data: {
      email: 'mockuser@example.com',
      name: 'Mock User',
    }
  });

  // Create a mock essay assist
  const essayAssist = await prisma.essayAssist.create({
    data: {
      userId: user.id,
      currentContent: 'This is the current content of the essay.',
      lastReviewData: {},
      appliedSuggestions: [],
    }
  });

  // Create a mock message
  await prisma.essayAssistMessage.create({
    data: {
      essayAssistId: essayAssist.id,
      role: 'user',
      content: 'This is a mock message.',
      highlights: [],
    }
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 