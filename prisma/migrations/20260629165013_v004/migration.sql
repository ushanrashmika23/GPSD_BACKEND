/*
  Warnings:

  - The values [APPLIES] on the enum `lesson_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `lesson` MODIFY `type` ENUM('PURE', 'APPLIED', 'COMMON') NOT NULL DEFAULT 'COMMON';
