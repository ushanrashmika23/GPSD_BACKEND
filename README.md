# GPSD Backend API

This is the Express.js and Prisma-based backend for the GPSD Class Management System.

## Architecture
It uses a 3-tier architecture handling logic for students, batches, lessons, fees, and attendance. It integrates with a separate Cloudflare worker for secure file/video CDN delivery using HMAC signed URLs.

## Features
- REST API for Admin, Staff, and Student operations.
- Prisma ORM mapping to a MySQL Database.
- Secure upload to local storage or Cloudflare R2.
- Short-lived signed URLs for media streaming.

## Running the code
1. Ensure XAMPP (MySQL) is running on port 3306.
2. Configure `.env` with `DATABASE_URL` and `CDN_SECRET`.
3. Run `npm i` to install dependencies.
4. Run `npx prisma generate` and `npx prisma migrate deploy` to set up the DB.
5. Run `npm run seed` to populate initial data.
6. Run `npm start` to start the backend server on port 5000.
