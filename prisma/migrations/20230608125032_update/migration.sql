-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "img" TEXT,
    "dataurls" TEXT[],

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
