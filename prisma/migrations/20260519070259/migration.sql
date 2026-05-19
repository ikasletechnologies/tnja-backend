-- CreateEnum
CREATE TYPE "EventLevel" AS ENUM ('DISTRICT', 'ZONE', 'STATE');

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_districtId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "level" "EventLevel" NOT NULL DEFAULT 'DISTRICT',
ADD COLUMN     "zoneId" TEXT,
ALTER COLUMN "districtId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
