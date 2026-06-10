/*
  Warnings:

  - A unique constraint covering the columns `[tempId]` on the table `Club` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "tempId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Club_tempId_key" ON "Club"("tempId");
