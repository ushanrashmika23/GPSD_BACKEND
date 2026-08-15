-- AlterTable
-- VARCHAR(191) was too small for JWTs (Prisma P2000).
-- TEXT is nullable and has no DEFAULT — MariaDB TEXT columns cannot carry a DEFAULT.
ALTER TABLE `user` MODIFY `jwt` TEXT NULL;
