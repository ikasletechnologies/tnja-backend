/*
  Warnings:

  - You are about to drop the column `location` on the `Club` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `CoachReferee` table. All the data in the column will be lost.
  - You are about to drop the column `taluk` on the `CoachReferee` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `taluk` on the `Student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Club` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address1` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `coach` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobileNumber` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pincode` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `president` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secretary` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `CoachReferee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `talukId` to the `CoachReferee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `talukId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Club" DROP COLUMN "location",
ADD COLUMN     "address1" TEXT NOT NULL,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "age12to18Female" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "age12to18Male" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "age16AboveFemale" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "age16AboveMale" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "age6to11Female" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "age6to11Male" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "coach" TEXT NOT NULL,
ADD COLUMN     "districtId" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "femaleStudents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maleStudents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mobileNumber" TEXT NOT NULL,
ADD COLUMN     "noOfStudents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pincode" TEXT NOT NULL,
ADD COLUMN     "president" TEXT NOT NULL,
ADD COLUMN     "secretary" TEXT NOT NULL,
ADD COLUMN     "talukId" TEXT;

-- AlterTable
ALTER TABLE "CoachReferee" DROP COLUMN "district",
DROP COLUMN "taluk",
ADD COLUMN     "districtId" TEXT NOT NULL,
ADD COLUMN     "talukId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "district",
DROP COLUMN "taluk",
ADD COLUMN     "districtId" TEXT NOT NULL,
ADD COLUMN     "talukId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taluk" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,

    CONSTRAINT "Taluk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "tempId" TEXT NOT NULL,
    "permanentId" TEXT,
    "districtId" TEXT NOT NULL,
    "talukId" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "gender" "Gender" NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "alternateMobileNumber" TEXT,
    "email" TEXT NOT NULL,
    "aadhaarNumber" TEXT NOT NULL,
    "aadhaarFront" TEXT,
    "aadhaarBack" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "addressPincode" TEXT NOT NULL,
    "employmentType" TEXT,
    "companyName" TEXT,
    "designation" TEXT,
    "workLocation" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "rejectionRemark" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "rejectionRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Member_tempId_key" ON "Member"("tempId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_permanentId_key" ON "Member"("permanentId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_mobileNumber_key" ON "Member"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_aadhaarNumber_key" ON "Member"("aadhaarNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Club_email_key" ON "Club"("email");

-- AddForeignKey
ALTER TABLE "Taluk" ADD CONSTRAINT "Taluk_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_talukId_fkey" FOREIGN KEY ("talukId") REFERENCES "Taluk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_talukId_fkey" FOREIGN KEY ("talukId") REFERENCES "Taluk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReferee" ADD CONSTRAINT "CoachReferee_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReferee" ADD CONSTRAINT "CoachReferee_talukId_fkey" FOREIGN KEY ("talukId") REFERENCES "Taluk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_talukId_fkey" FOREIGN KEY ("talukId") REFERENCES "Taluk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
