/*
  Warnings:

  - You are about to drop the `TournamentRegistrationMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TournamentRegistrationMessage" DROP CONSTRAINT "TournamentRegistrationMessage_registrationId_fkey";

-- DropTable
DROP TABLE "TournamentRegistrationMessage";
