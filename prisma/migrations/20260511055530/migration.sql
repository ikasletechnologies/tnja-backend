-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'REJECTED', 'APPROVED', 'REPLAY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "tempId" TEXT NOT NULL,
    "permanentId" TEXT,
    "district" TEXT NOT NULL,
    "taluk" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "gender" "Gender" NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "age" INTEGER NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "alternateMobileNumber" TEXT,
    "email" TEXT NOT NULL,
    "aadhaarNumber" TEXT NOT NULL,
    "aadhaarProof" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "addressPincode" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "annualIncome" DOUBLE PRECISION NOT NULL,
    "incomeProof" TEXT,
    "isBPL" BOOLEAN NOT NULL DEFAULT false,
    "bplProof" TEXT,
    "clubId" TEXT,
    "schoolName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "areaOfInterest" TEXT NOT NULL,
    "areaOfStudy" TEXT NOT NULL,
    "preferLocation" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "rejectionRemark" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachReferee" (
    "id" TEXT NOT NULL,
    "tempId" TEXT NOT NULL,
    "permanentId" TEXT,
    "district" TEXT NOT NULL,
    "taluk" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "gender" "Gender" NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "age" INTEGER NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "alternateMobileNumber" TEXT,
    "email" TEXT NOT NULL,
    "aadhaarNumber" TEXT NOT NULL,
    "historyInJudo" TEXT NOT NULL,
    "historyInOtherMartial" TEXT NOT NULL,
    "presentGradeInJudo" TEXT NOT NULL,
    "coachName" TEXT,
    "refereeName" TEXT,
    "deptName" TEXT NOT NULL,
    "contactPersonDept" TEXT NOT NULL,
    "addressDept" TEXT NOT NULL,
    "clubId" TEXT,
    "password" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "rejectionRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachReferee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_tempId_key" ON "Student"("tempId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_permanentId_key" ON "Student"("permanentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_mobileNumber_key" ON "Student"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_aadhaarNumber_key" ON "Student"("aadhaarNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CoachReferee_tempId_key" ON "CoachReferee"("tempId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachReferee_permanentId_key" ON "CoachReferee"("permanentId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachReferee_mobileNumber_key" ON "CoachReferee"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CoachReferee_email_key" ON "CoachReferee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoachReferee_aadhaarNumber_key" ON "CoachReferee"("aadhaarNumber");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReferee" ADD CONSTRAINT "CoachReferee_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
