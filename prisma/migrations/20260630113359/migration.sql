-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "assignedDistrictId" TEXT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_assignedDistrictId_fkey" FOREIGN KEY ("assignedDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
