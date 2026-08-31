-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "lessonId" TEXT,
    "sourceKey" TEXT,
    CONSTRAINT "Prompt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Prompt" ("body", "category", "copyCount", "id", "title", "useCase", "verified") SELECT "body", "category", "copyCount", "id", "title", "useCase", "verified" FROM "Prompt";
DROP TABLE "Prompt";
ALTER TABLE "new_Prompt" RENAME TO "Prompt";
CREATE UNIQUE INDEX "Prompt_sourceKey_key" ON "Prompt"("sourceKey");
CREATE INDEX "Prompt_category_idx" ON "Prompt"("category");
CREATE INDEX "Prompt_lessonId_idx" ON "Prompt"("lessonId");
CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "lessonId" TEXT,
    "sourceKey" TEXT,
    CONSTRAINT "Resource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Resource" ("body", "id", "kind", "summary", "title", "updatedAt", "version") SELECT "body", "id", "kind", "summary", "title", "updatedAt", "version" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE UNIQUE INDEX "Resource_sourceKey_key" ON "Resource"("sourceKey");
CREATE INDEX "Resource_lessonId_idx" ON "Resource"("lessonId");
CREATE INDEX "Resource_kind_idx" ON "Resource"("kind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
