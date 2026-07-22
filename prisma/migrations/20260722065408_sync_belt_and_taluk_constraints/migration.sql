-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "belt" TEXT;

-- AlterTable
ALTER TABLE "Taluk" ALTER COLUMN "pincode" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN     "belt" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Taluk_districtId_name_key" ON "Taluk"("districtId", "name");
