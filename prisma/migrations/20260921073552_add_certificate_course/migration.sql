-- Сертифікат прив'язується до КУРСУ, за який його видано, і зберігає назву
-- курсу знімком на момент видачі (як holderName і organizationName).
--
-- Перенесення наявних рядків: курс визначаємо не навмання, а з історії —
-- це той курс, чию фінальну атестацію власник сертифіката склав. COALESCE
-- нижче — страхувальна сітка на випадок рядка без зарахованої спроби (такий
-- сертифікат міг з'явитися лише вручну): міграція не має права впасти, тож
-- підставляємо перший відкритий курс, а зовсім без курсів — нейтральний текст.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "holderPosition" TEXT,
    "organizationName" TEXT,
    "score" INTEGER NOT NULL,
    "withHonors" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedReason" TEXT,
    "courseId" TEXT,
    "courseTitle" TEXT NOT NULL,
    CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Certificate" (
    "id", "code", "userId", "holderName", "holderPosition", "organizationName",
    "score", "withHonors", "issuedAt", "validUntil", "revoked", "revokedReason",
    "courseId", "courseTitle"
)
SELECT
    c."id", c."code", c."userId", c."holderName", c."holderPosition", c."organizationName",
    c."score", c."withHonors", c."issuedAt", c."validUntil", c."revoked", c."revokedReason",
    (
        SELECT f."courseId"
        FROM "ExamAttempt" ea
        JOIN "FinalExam" f ON f."id" = ea."examId"
        WHERE ea."userId" = c."userId" AND ea."passed" = true
        ORDER BY ea."createdAt" DESC
        LIMIT 1
    ),
    COALESCE(
        (
            SELECT co."title"
            FROM "ExamAttempt" ea
            JOIN "FinalExam" f ON f."id" = ea."examId"
            JOIN "Course" co ON co."id" = f."courseId"
            WHERE ea."userId" = c."userId" AND ea."passed" = true
            ORDER BY ea."createdAt" DESC
            LIMIT 1
        ),
        (SELECT co2."title" FROM "Course" co2 ORDER BY co2."comingSoon" ASC, co2."title" ASC LIMIT 1),
        'Курс платформи'
    )
FROM "Certificate" c;

DROP TABLE "Certificate";
ALTER TABLE "new_Certificate" RENAME TO "Certificate";
CREATE UNIQUE INDEX "Certificate_code_key" ON "Certificate"("code");
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
