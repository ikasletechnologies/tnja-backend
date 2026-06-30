/*
  Warnings:

  - You are about to drop the column `aadhaarBack` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `aadhaarFront` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `aadhaarProof` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `areaOfInterest` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `areaOfStudy` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `incomeProof` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `preferLocation` on the `Student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tournamentId,ageGroup,exactAge,gender,weightCategory]` on the table `TournamentDraw` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Placement" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'PARTICIPATION');

-- AlterEnum
ALTER TYPE "EventLevel" ADD VALUE 'CLUB';

-- DropIndex
DROP INDEX "TournamentDraw_tournamentId_ageGroup_gender_weightCategory_key";

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "profilePhoto" TEXT;

-- AlterTable
ALTER TABLE "CoachReferee" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "employmentType" TEXT,
ALTER COLUMN "deptName" DROP NOT NULL,
ALTER COLUMN "contactPersonDept" DROP NOT NULL,
ALTER COLUMN "addressDept" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "eventSection" TEXT;

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "aadhaarBack",
DROP COLUMN "aadhaarFront";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "aadhaarProof",
DROP COLUMN "areaOfInterest",
DROP COLUMN "areaOfStudy",
DROP COLUMN "incomeProof",
DROP COLUMN "preferLocation",
ADD COLUMN     "degreeDepartment" TEXT,
ADD COLUMN     "institutionType" TEXT DEFAULT 'SCHOOL';

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "numberOfMats" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "zoneId" TEXT;

-- AlterTable
ALTER TABLE "TournamentDraw" ADD COLUMN     "exactAge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "matNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN     "coachId" TEXT,
ADD COLUMN     "placement" "Placement" DEFAULT 'PARTICIPATION';

-- CreateTable
CREATE TABLE "ApplicationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AadhaarOTP" (
    "id" TEXT NOT NULL,
    "aadhaar" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AadhaarOTP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AadhaarOTP_aadhaar_key" ON "AadhaarOTP"("aadhaar");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDraw_tournamentId_ageGroup_exactAge_gender_weight_key" ON "TournamentDraw"("tournamentId", "ageGroup", "exactAge", "gender", "weightCategory");

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachReferee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
