CREATE TABLE "ProfileEditRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "requestedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileEditRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileEditRequest_studentId_status_idx" ON "ProfileEditRequest"("studentId", "status");
CREATE INDEX "ProfileEditRequest_coachId_status_idx" ON "ProfileEditRequest"("coachId", "status");

ALTER TABLE "ProfileEditRequest" ADD CONSTRAINT "ProfileEditRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileEditRequest" ADD CONSTRAINT "ProfileEditRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachReferee"("id") ON DELETE CASCADE ON UPDATE CASCADE;