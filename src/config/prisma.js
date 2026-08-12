const { PrismaClient } = require("@prisma/client");

// Prisma 6 client — Node 20.11 cannot run Prisma 7.
const prisma = new PrismaClient();

module.exports = prisma;
