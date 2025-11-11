-- CreateTable
CREATE TABLE "PromptCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "collectionId" TEXT,
    "currentVersionId" TEXT,
    "tags" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptTemplate_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "PromptCollection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptTemplate_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "PromptVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "changeDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptCollection_name_key" ON "PromptCollection"("name");

-- CreateIndex
CREATE INDEX "PromptCollection_name_idx" ON "PromptCollection"("name");

-- CreateIndex
CREATE INDEX "PromptCollection_createdAt_idx" ON "PromptCollection"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_currentVersionId_key" ON "PromptTemplate"("currentVersionId");

-- CreateIndex
CREATE INDEX "PromptTemplate_name_idx" ON "PromptTemplate"("name");

-- CreateIndex
CREATE INDEX "PromptTemplate_collectionId_idx" ON "PromptTemplate"("collectionId");

-- CreateIndex
CREATE INDEX "PromptTemplate_isFavorite_idx" ON "PromptTemplate"("isFavorite");

-- CreateIndex
CREATE INDEX "PromptTemplate_createdAt_idx" ON "PromptTemplate"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_name_collectionId_key" ON "PromptTemplate"("name", "collectionId");

-- CreateIndex
CREATE INDEX "PromptVersion_promptId_versionNumber_idx" ON "PromptVersion"("promptId", "versionNumber");

-- CreateIndex
CREATE INDEX "PromptVersion_createdAt_idx" ON "PromptVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptId_versionNumber_key" ON "PromptVersion"("promptId", "versionNumber");
