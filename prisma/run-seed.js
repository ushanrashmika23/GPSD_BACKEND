require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const seedFile = path.join(__dirname, "..", "seed.sql");
const mysqlCandidates = [
    "C:\\xampp\\mysql\\bin\\mysql.exe",
    "C:\\Xampp\\mysql\\bin\\mysql.exe",
];
const mysql = mysqlCandidates.find((p) => fs.existsSync(p));

if (!mysql) {
    console.error("XAMPP mysql.exe not found. Run seed.sql from phpMyAdmin instead.");
    process.exit(1);
}

const url = process.env.DATABASE_URL || "mysql://root:@localhost:3306/gpsd_db";
const parsed = new URL(url);
const database = parsed.pathname.replace(/^\//, "");
const user = decodeURIComponent(parsed.username || "root");
const password = decodeURIComponent(parsed.password || "");
const host = parsed.hostname || "localhost";
const port = parsed.port || "3306";

const args = ["-h", host, "-P", port, "-u", user, database];
if (password) args.splice(4, 0, `-p${password}`);

execFileSync(mysql, args, {
    input: fs.readFileSync(seedFile),
    stdio: ["pipe", "inherit", "inherit"],
});

console.log("Seed SQL applied to", database);
