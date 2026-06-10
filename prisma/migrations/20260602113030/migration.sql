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

-- AddForeignKey
ALTER TABLE "TournamentRegistrationMessage" ADD CONSTRAINT "TournamentRegistrationMessage_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "TournamentRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
