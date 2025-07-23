-- AlterTable
ALTER TABLE "EssayAssist" ADD COLUMN     "essayType" TEXT,
ADD COLUMN     "maxWords" INTEGER,
ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "wordCount" INTEGER;
