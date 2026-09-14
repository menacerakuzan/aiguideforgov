-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "comingSoon" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Course" ("description", "id", "slug", "title") SELECT "description", "id", "slug", "title" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_slug_idx" ON "Course"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
