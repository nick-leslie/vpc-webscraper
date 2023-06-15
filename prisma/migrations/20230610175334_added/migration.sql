/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PROJECT_TYPE" AS ENUM ('IQP', 'DATA', 'APP', 'PUBLICATION');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "type" "PROJECT_TYPE" NOT NULL;

-- CreateTable
CREATE TABLE "iqp_team" (
    "id" SERIAL NOT NULL,
    "sponsors" TEXT[],
    "team" TEXT[],
    "advisors" TEXT[],
    "projectId" TEXT NOT NULL,

    CONSTRAINT "iqp_team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "iqp_team_id_key" ON "iqp_team"("id");

-- CreateIndex
CREATE UNIQUE INDEX "iqp_team_projectId_key" ON "iqp_team"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_key" ON "Project"("id");

-- AddForeignKey
ALTER TABLE "iqp_team" ADD CONSTRAINT "iqp_team_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
