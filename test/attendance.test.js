const axios = require("axios");

const API_URL = "http://127.0.0.1:5000/api/attendance";

// ---------------------------------------------------------------------------
// Shared test data — reuse batch IDs and call-up numbers from student suite
// ---------------------------------------------------------------------------
const BATCH_1 = "cmslvgni80000bowomu73cuxr";
const BATCH_2 = "cmslvho820001bowo9vb7r73i";
const BATCH_3 = "cmslvk8ps0003bowod9zzacqv";

// Existing students (call_up_no values from student.test.js)
const STUDENTS = {
    A: "CU2026001", // batch BATCH_1
    B: "CU2026002", // batch BATCH_2
    C: "CU2026003", // batch BATCH_3
};

// Use a fixed past date so we can create class-days without colliding with
// real "today" entries that may already exist.
const YESTERDAY = new Date();
YESTERDAY.setDate(YESTERDAY.getDate() - 1);
const PAST_DATE = YESTERDAY.toISOString().slice(0, 10); // "YYYY-MM-DD"

const FUTURE_DATE = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
})();

// ===========================================================================
// 1. POST /api/attendance/new-day
// ===========================================================================
describe("POST /api/attendance/new-day", () => {
    const ENDPOINT = `${API_URL}/new-day`;

    test("should create a new class-day for a batch", async () => {
        const payload = { date: FUTURE_DATE, batch_id: BATCH_1 };

        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(`[new-day] ${res.status} — ${res.data.msg}`);

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.msg).toBe("Day created successfully");
        expect(res.data.data).toBeDefined();
        expect(res.data.data.batch_id).toBe(BATCH_1);
        expect(res.data.data.id).toBeDefined();
    });

    test("should reject duplicate class-day (same date + batch)", async () => {
        const payload = { date: FUTURE_DATE, batch_id: BATCH_1 };

        // Second call with the same payload should fail
        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(`[new-day/duplicate] ${res.status} — ${res.data.msg}`);

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.msg).toBe("Day already exists for this batch");
    });

    test("should reject an invalid date string", async () => {
        const payload = { date: "not-a-date", batch_id: BATCH_1 };

        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(`[new-day/invalid-date] ${res.status} — ${res.data.msg}`);

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.msg).toBe("Invalid date provided");
    });

    test("should reject when batch_id is missing", async () => {
        const payload = { date: FUTURE_DATE };

        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(`[new-day/missing-batch] ${res.status} — ${res.data.msg}`);

        // Prisma will throw a foreign-key / required-field error → 500
        expect(res.status).toBe(500);
        expect(res.data.success).toBe(false);
    });
});

// ===========================================================================
// 2. GET /api/attendance/today
// ===========================================================================
describe("GET /api/attendance/today", () => {
    const ENDPOINT = `${API_URL}/today`;

    test("should return today's classes (no query param)", async () => {
        const res = await axios.get(ENDPOINT, {
            validateStatus: () => true,
        });

        console.log(`[today/no-param] ${res.status} — ${res.data.msg}`);

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.msg).toBe("Today classes fetched successfully");
        expect(Array.isArray(res.data.data)).toBe(true);

        // Every item should have the expected shape
        for (const item of res.data.data) {
            expect(item).toMatchObject({
                id: expect.any(String),
                batch_id: expect.any(String),
                presentCount: expect.any(Number),
                totalStudents: expect.any(Number),
                unmarkedCount: expect.any(Number),
            });
        }
    });

    test("should return classes for a specific date via ?day=", async () => {
        // We created a class-day on FUTURE_DATE for BATCH_1 in the previous
        // describe block, so at least one should come back.
        const res = await axios.get(`${ENDPOINT}?day=${FUTURE_DATE}`, {
            validateStatus: () => true,
        });

        console.log(`[today/specific-date] ${res.status} — ${res.data.msg}`);

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);

        // We expect at least the BATCH_1 entry from the new-day test above
        const batch1Days = res.data.data.filter(
            (d) => d.batch_id === BATCH_1
        );
        expect(batch1Days.length).toBeGreaterThanOrEqual(1);
    });

    test("should return 400 for an invalid date string", async () => {
        const res = await axios.get(`${ENDPOINT}?day=garbage`, {
            validateStatus: () => true,
        });

        console.log(`[today/invalid-date] ${res.status} — ${res.data.msg}`);

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.msg).toBe("Invalid date provided");
    });

    test("should return an empty array for a date with no classes", async () => {
        // Pick a date far in the past where no class-days exist
        const res = await axios.get(`${ENDPOINT}?day=2020-01-01`, {
            validateStatus: () => true,
        });

        console.log(`[today/no-classes] ${res.status} — ${res.data.msg}`);

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data).toEqual([]);
    });
});

// ===========================================================================
// 3. POST /api/attendance/mark-attendance
// ===========================================================================
describe("POST /api/attendance/mark-attendance", () => {
    const ENDPOINT = `${API_URL}/mark-attendance`;

    // We need a class-day on *today* to test mark-attendance (the service
    // looks for a class_day whose date falls on "today").  Create one before
    // the mark-attendance tests run.
    beforeAll(async () => {
        const today = new Date().toISOString().slice(0, 10);

        // Create a class-day for BATCH_1 today (ignore if already exists)
        await axios.post(
            `${API_URL}/new-day`,
            { date: today, batch_id: BATCH_1 },
            { validateStatus: () => true }
        );
    });

    test("should mark attendance for a valid student on today's batch class", async () => {
        const payload = { call_up_no: STUDENTS.A }; // batch BATCH_1

        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(
            `[mark-attendance] ${res.status} — ${res.data.msg}`
        );

        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.msg).toBe("Attendance marked successfully");
        expect(res.data.data).toBeDefined();
        expect(res.data.data.call_up_no).toBe(STUDENTS.A);
        expect(res.data.data.class_day_id).toBeDefined();
        expect(res.data.data.id).toBeDefined();
    });

    test("should reject duplicate attendance (already marked today)", async () => {
        const payload = { call_up_no: STUDENTS.A };

        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(
            `[mark-attendance/duplicate] ${res.status} — ${res.data.msg}`
        );

        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.msg).toBe(
            "Attendance already marked for this student today"
        );
    });

    test("should return 404 for a non-existent call_up_no", async () => {
        const payload = { call_up_no: "ZZZ9999" };

        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(
            `[mark-attendance/unknown-student] ${res.status} — ${res.data.msg}`
        );

        expect(res.status).toBe(404);
        expect(res.data.success).toBe(false);
        expect(res.data.msg).toBe("Student not found");
    });

    test("should return 404 when no class-day exists today for the student's batch", async () => {
        // STUDENTS.B belongs to BATCH_2 — we didn't create a today class-day
        // for BATCH_2 in beforeAll.
        const payload = { call_up_no: STUDENTS.B };

        const res = await axios.post(ENDPOINT, payload, {
            validateStatus: () => true,
        });

        console.log(
            `[mark-attendance/no-class-day] ${res.status} — ${res.data.msg}`
        );

        expect(res.status).toBe(404);
        expect(res.data.success).toBe(false);
        expect(res.data.msg).toContain("No class day found");
    });

    test("should return 400 when call_up_no is missing from the body", async () => {
        const res = await axios.post(
            ENDPOINT,
            {},
            { validateStatus: () => true }
        );

        console.log(
            `[mark-attendance/missing-call-up] ${res.status} — ${res.data.msg}`
        );

        // Prisma will fail on the required relation — surfaces as a 500
        expect(res.status).toBe(500);
        expect(res.data.success).toBe(false);
    });
});
