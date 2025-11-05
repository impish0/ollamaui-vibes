-- CreateTable
CREATE TABLE "PromptLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT,
    "model" TEXT NOT NULL,
    "messages" TEXT NOT NULL,
    "ragContext" TEXT,
    "collectionIds" TEXT,
    "estimatedTokens" INTEGER NOT NULL,
    "contextWindowSize" INTEGER NOT NULL,
    "responseTokens" INTEGER,
    "response" TEXT,
    "responseTime" INTEGER,
    "error" TEXT,
    "userMessage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PromptLog_chatId_createdAt_idx" ON "PromptLog"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptLog_model_idx" ON "PromptLog"("model");

-- CreateIndex
CREATE INDEX "PromptLog_createdAt_idx" ON "PromptLog"("createdAt");
