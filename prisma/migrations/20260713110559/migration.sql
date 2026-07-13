/*
  Warnings:

  - A unique constraint covering the columns `[tournamentId,playerId,ageGroup,weightCategory]` on the table `TournamentRegistration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TournamentRegistration_tournamentId_playerId_key";

-- AlterTable
ALTER TABLE "TournamentDraw" ADD COLUMN     "isConcluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN     "ageGroup" TEXT NOT NULL DEFAULT 'SENIOR',
ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'MALE',
ADD COLUMN     "weightCategory" TEXT NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE "TournamentMat" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "matNumber" INTEGER NOT NULL,
    "refereeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentMat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMat_tournamentId_matNumber_key" ON "TournamentMat"("tournamentId", "matNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_playerId_ageGroup_weigh_key" ON "TournamentRegistration"("tournamentId", "playerId", "ageGroup", "weightCategory");

-- AddForeignKey
ALTER TABLE "TournamentMat" ADD CONSTRAINT "TournamentMat_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "CoachReferee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMat" ADD CONSTRAINT "TournamentMat_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
