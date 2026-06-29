const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const databaseUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
	host: databaseUrl.hostname,
	port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
	user: decodeURIComponent(databaseUrl.username),
	password: decodeURIComponent(databaseUrl.password),
	database: databaseUrl.pathname.replace(/^\//, ""),
});

const prisma = new PrismaClient({
	adapter,
});

module.exports = prisma;