/*
  Warnings:

  - A unique constraint covering the columns `[gAuthID]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `gAuthID` VARCHAR(191) NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE UNIQUE INDEX `user_gAuthID_key` ON `user`(`gAuthID`);
