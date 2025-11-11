-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "collectionId" TEXT,
    "currentVersionId" TEXT,
    "tags" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isSystemPrompt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptTemplate_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "PromptCollection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptTemplate_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "PromptVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromptTemplate" ("collectionId", "createdAt", "currentVersionId", "description", "id", "isFavorite", "name", "tags", "updatedAt") SELECT "collectionId", "createdAt", "currentVersionId", "description", "id", "isFavorite", "name", "tags", "updatedAt" FROM "PromptTemplate";
DROP TABLE "PromptTemplate";
ALTER TABLE "new_PromptTemplate" RENAME TO "PromptTemplate";
CREATE UNIQUE INDEX "PromptTemplate_currentVersionId_key" ON "PromptTemplate"("currentVersionId");
CREATE INDEX "PromptTemplate_name_idx" ON "PromptTemplate"("name");
CREATE INDEX "PromptTemplate_collectionId_idx" ON "PromptTemplate"("collectionId");
CREATE INDEX "PromptTemplate_isFavorite_idx" ON "PromptTemplate"("isFavorite");
CREATE INDEX "PromptTemplate_isSystemPrompt_idx" ON "PromptTemplate"("isSystemPrompt");
CREATE INDEX "PromptTemplate_createdAt_idx" ON "PromptTemplate"("createdAt");
CREATE UNIQUE INDEX "PromptTemplate_name_collectionId_key" ON "PromptTemplate"("name", "collectionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
