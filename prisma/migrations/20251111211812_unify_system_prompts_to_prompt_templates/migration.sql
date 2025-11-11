/*
  Warnings:

  - You are about to drop the `SystemPrompt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "SystemPrompt_createdAt_idx";

-- DropIndex
DROP INDEX "SystemPrompt_name_idx";

-- DropIndex
DROP INDEX "SystemPrompt_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SystemPrompt";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "model" TEXT NOT NULL,
    "systemPromptId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chat_systemPromptId_fkey" FOREIGN KEY ("systemPromptId") REFERENCES "PromptTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Chat" ("createdAt", "id", "model", "systemPromptId", "title", "updatedAt") SELECT "createdAt", "id", "model", "systemPromptId", "title", "updatedAt" FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";
CREATE INDEX "Chat_createdAt_idx" ON "Chat"("createdAt");
CREATE INDEX "Chat_updatedAt_idx" ON "Chat"("updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
