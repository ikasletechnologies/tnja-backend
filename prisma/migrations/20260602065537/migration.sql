-- CreateEnum
CREATE TYPE "EventParticipantType" AS ENUM ('ALL', 'STUDENT', 'COACH', 'MEMBER', 'CLUB');

-- AlterEnum
ALTER TYPE "EventLevel" ADD VALUE 'NATIONAL';

-- AlterEnum
ALTER TYPE "MemberRole" ADD VALUE 'CEO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Status" ADD VALUE 'CLOSED';
ALTER TYPE "Status" ADD VALUE 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CoachReferee" ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "entryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "participantType" "EventParticipantType" NOT NULL DEFAULT 'ALL';

-- AlterTable
ALTER TABLE "Grievance" ADD COLUMN     "remark" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "coachId" TEXT,
ADD COLUMN     "draws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validUntil" TIMESTAMP(3),
ADD COLUMN     "wins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSlots" INTEGER NOT NULL DEFAULT 32,
    "ageFrom" INTEGER NOT NULL DEFAULT 0,
    "ageTo" INTEGER NOT NULL DEFAULT 100,
    "gender" TEXT NOT NULL DEFAULT 'BOTH',
    "allowBPL" BOOLEAN NOT NULL DEFAULT false,
    "beltEligibility" TEXT,
    "level" "EventLevel" NOT NULL DEFAULT 'DISTRICT',
    "districtApproval" "Status" NOT NULL DEFAULT 'PENDING',
    "stateApproval" "Status" NOT NULL DEFAULT 'PENDING',
    "superAdminApproval" "Status" NOT NULL DEFAULT 'PENDING',
    "ceoApproval" "Status" NOT NULL DEFAULT 'PENDING',
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "rejectionRemark" TEXT,
    "clubId" TEXT,
    "officialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRegistrationMessage" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentRegistrationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentDraw" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "weightCategory" TEXT NOT NULL,
    "rounds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_playerId_key" ON "TournamentRegistration"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDraw_tournamentId_ageGroup_gender_weightCategory_key" ON "TournamentDraw"("tournamentId", "ageGroup", "gender", "weightCategory");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachReferee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_officialId_fkey" FOREIGN KEY ("officialId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistrationMessage" ADD CONSTRAINT "TournamentRegistrationMessage_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "TournamentRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDraw" ADD CONSTRAINT "TournamentDraw_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
