-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EssayAssist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentContent" TEXT NOT NULL,
    "lastReviewData" JSONB,
    "lastReviewAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedSuggestions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "EssayAssist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EssayAssistMessage" (
    "id" TEXT NOT NULL,
    "essayAssistId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EssayAssistMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "EssayAssist" ADD CONSTRAINT "EssayAssist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EssayAssistMessage" ADD CONSTRAINT "EssayAssistMessage_essayAssistId_fkey" FOREIGN KEY ("essayAssistId") REFERENCES "EssayAssist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
