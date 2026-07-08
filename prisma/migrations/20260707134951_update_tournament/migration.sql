/*
  Warnings:

  - You are about to drop the column `totalSlots` on the `Tournament` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'DISQUALIFIED';

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "totalSlots",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "registrationClosed" BOOLEAN NOT NULL DEFAULT false;
