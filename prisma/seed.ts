import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.essayAssist.create({
    data: {
      prompt: 'Describe a challenge you overcame.',
      essayType: 'personal',
      maxWords: 500,
      wordCount: 0,
      status: 'draft',
      currentContent: 'This is a seeded essay. Edit me!',
      lastReviewData: {},
      appliedSuggestions: [],
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