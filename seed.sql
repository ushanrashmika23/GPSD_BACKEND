-- ============================================================================
-- GPSD Sample Data Seed Script
-- Database: gpsd001
-- ============================================================================

-- Password for all test users: "password123"
-- bcrypt hash: $2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi

-- ============================================================================
-- 1. USERS (7 users: 1 admin, 1 staff, 5 students)
-- ============================================================================
INSERT IGNORE INTO user (id, email, gAuthID, password, jwt, lastLogin, createdAt, roles, mobile, first_name, last_name, is_active, address)
VALUES
('u001', 'admin@gpsd.edu.lk',  'local-u001', '$2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi', 'none', NOW(), NOW(), 'admin',  '0771000001', 'Admin',    'User',     1, '123 Admin Street, Colombo'),
('u002', 'staff@gpsd.edu.lk',  'local-u002', '$2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi', 'none', NOW(), NOW(), 'staff',  '0771000002', 'Staff',    'Member',    1, '456 Staff Avenue, Kandy'),
('u003', 'sachin@gpsd.edu.lk', 'local-u003', '$2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi', 'none', NOW(), NOW(), 'student','0772000001', 'Sachin',   'Perera',    1, '10 Galle Road, Colombo'),
('u004', 'amaya@gpsd.edu.lk',  'local-u004', '$2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi', 'none', NOW(), NOW(), 'student','0772000002', 'Amaya',    'Fernando',  1, '22 Hill Street, Negombo'),
('u005', 'kasun@gpsd.edu.lk',  'local-u005', '$2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi', 'none', NOW(), NOW(), 'student','0772000003', 'Kasun',    'Jayawardena',1, '5 Lake Road, Kandy'),
('u006', 'nimali@gpsd.edu.lk', 'local-u006', '$2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi', 'none', NOW(), NOW(), 'student','0772000004', 'Nimali',   'Bandara',   1, '78 Temple Road, Galle'),
('u007', 'ruwan@gpsd.edu.lk',  'local-u007', '$2b$10$wlchZpjnBQvL/GBg5wJKEOxdqLonCK0dvNvlh2NF/qr.szj2z.xEi', 'none', NOW(), NOW(), 'student','0772000005', 'Ruwan',    'Silva',     1, '33 Fort Road, Matara');

-- ============================================================================
-- 2. BATCHES (2 batches)
-- ============================================================================
INSERT IGNORE INTO batch (id, name, exam_date, class_fee, is_active, start_time, end_time, created_at, day)
VALUES
('b001', '2025 Jan - Pure Mathematics',   '2025-12-15 09:00:00', 15000.00, 1, '08:00', '12:00', NOW(), 'Monday'),
('b002', '2025 Jan - Applied Mathematics', '2025-12-16 09:00:00', 15000.00, 1, '13:00', '17:00', NOW(), 'Wednesday');

-- ============================================================================
-- 3. STUDENTS (5 students, linked to users and batches)
-- ============================================================================
INSERT IGNORE INTO student (call_up_no, school, parent_name, parent_mobile, user_id, batch_id)
VALUES
('GPSD001', 'Royal College Colombo',     'Sunil Perera',     '0773000001', 'u003', 'b001'),
('GPSD002', 'Visakha Vidyalaya',         'Nimal Fernando',   '0773000002', 'u004', 'b001'),
('GPSD003', 'Dharmaraja College Kandy',  'Bandula Jayawardena','0773000003','u005', 'b001'),
('GPSD004', 'Mahinda College Galle',     'Sarath Bandara',   '0773000004', 'u006', 'b002'),
('GPSD005', 'Rahula College Matara',     'Premasiri Silva',  '0773000005', 'u007', 'b002');

-- ============================================================================
-- 4. LESSONS (4 lessons)
-- ============================================================================
INSERT IGNORE INTO lesson (id, title, description, type, created_at)
VALUES
('l001', 'Introduction to Algebra',     'Fundamental algebra concepts including equations, inequalities, and polynomials', 'PURE',   NOW()),
('l002', 'Calculus Basics',             'Limits, derivatives, and basic integration techniques',                          'PURE',   NOW()),
('l003', 'Statistics Fundamentals',     'Descriptive statistics, probability distributions, and hypothesis testing',       'APPLIED',NOW()),
('l004', 'Mechanics',                   'Newtonian mechanics, kinematics, and dynamics',                                  'APPLIED',NOW());

-- ============================================================================
-- 5. MATERIALS (4 materials)
-- ============================================================================
INSERT IGNORE INTO material (id, title, description, material_url, type, lesson_id)
VALUES
('m001', 'Algebra Textbook Chapter 1',   'Chapter 1: Linear Equations and Inequalities',           'DOCUMENT/m001-algebra-ch1.pdf',   'DOCUMENT', 'l001'),
('m002', 'Calculus Video Lecture 1',     'Introduction to Limits — 45 minute video lecture',         'VIDEO/m002-calculus-lec1.mp4',    'VIDEO',    'l002'),
('m003', 'Statistics Handout Week 1',    'Probability distributions handout with practice problems', 'DOCUMENT/m003-stats-handout.pdf', 'DOCUMENT', 'l003'),
('m004', 'Mechanics Problem Set 1',      'Kinematics problem set — 20 problems with solutions',      'DOCUMENT/m004-mechanics-ps1.pdf', 'DOCUMENT', 'l004');

-- ============================================================================
-- 6. MATERIAL ACCESS (grant materials to batches)
-- ============================================================================
INSERT IGNORE INTO material_access (id, expiry_date, created_at, batch_id, material_id)
VALUES
('ma001', '2026-12-31 23:59:59', NOW(), 'b001', 'm001'),
('ma002', '2026-12-31 23:59:59', NOW(), 'b001', 'm002'),
('ma003', '2026-12-31 23:59:59', NOW(), 'b002', 'm003'),
('ma004', '2026-08-15 23:59:59', NOW(), 'b002', 'm004');  -- Expires soon (testing expiry filter)

-- ============================================================================
-- 7. PAPERS (3 papers with marks)
-- ============================================================================
INSERT IGNORE INTO paper (id, paper_name, paper_date, avg_marks, is_mark_released, created_at, batch_id, material_id)
VALUES
('p001', 'Term Test 1 — Pure Mathematics',  '2025-06-15 09:00:00', NULL, 0, NOW(), 'b001', 'm001'),
('p002', 'Mid Term — Applied Mathematics',  '2025-07-20 09:00:00', NULL, 0, NOW(), 'b002', 'm003'),
('p003', 'Final Exam — Pure Mathematics',   '2025-08-10 09:00:00', 72.5, 1, NOW(), 'b001', 'm001');

-- ============================================================================
-- 8. STUDENT MARKS (mix of entered and pending)
-- ============================================================================

-- Paper 1 marks (Term Test 1 - Pure Math, Batch 1 students)
INSERT IGNORE INTO student_marks (id, marks, comments, created_at, call_up_no, paper_id)
VALUES
('sm001', 85.0, 'Good work',              NOW(), 'GPSD001', 'p001'),
('sm002', 72.0, 'Needs improvement',      NOW(), 'GPSD002', 'p001'),
('sm003', 91.0, 'Excellent performance',  NOW(), 'GPSD003', 'p001');

-- Paper 2 marks (Mid Term - Applied Math, Batch 2 students)
INSERT IGNORE INTO student_marks (id, marks, comments, created_at, call_up_no, paper_id)
VALUES
('sm004', 78.0, 'none', NOW(), 'GPSD004', 'p002'),
('sm005', 65.0, 'none', NOW(), 'GPSD005', 'p002');

-- Paper 3 marks (Final Exam - Pure Math, Batch 1 students, published)
INSERT IGNORE INTO student_marks (id, marks, comments, created_at, call_up_no, paper_id)
VALUES
('sm006', 88.0, 'Great improvement',      NOW(), 'GPSD001', 'p003'),
('sm007', 56.0, 'Must work harder',       NOW(), 'GPSD002', 'p003'),
('sm008', 73.5, 'Satisfactory',           NOW(), 'GPSD003', 'p003');

-- ============================================================================
-- 9. CLASS DAYS (attendance sessions)
-- ============================================================================
INSERT IGNORE INTO class_day (id, date, batch_id)
VALUES
('cd001', '2025-06-02 08:00:00', 'b001'),  -- Monday
('cd002', '2025-06-09 08:00:00', 'b001'),  -- Monday
('cd003', '2025-06-04 13:00:00', 'b002');  -- Wednesday

-- ============================================================================
-- 10. ATTENDANCE
-- ============================================================================
INSERT IGNORE INTO attendance (id, time_in, call_up_no, class_day_id)
VALUES
('a001', '2025-06-02 08:05:00', 'GPSD001', 'cd001'),
('a002', '2025-06-02 08:10:00', 'GPSD002', 'cd001'),
('a003', '2025-06-02 08:02:00', 'GPSD003', 'cd001'),
('a004', '2025-06-09 08:07:00', 'GPSD001', 'cd002'),
('a005', '2025-06-09 08:15:00', 'GPSD003', 'cd002'),
('a006', '2025-06-04 13:02:00', 'GPSD004', 'cd003'),
('a007', '2025-06-04 13:05:00', 'GPSD005', 'cd003');

-- ============================================================================
-- 11. PAYMENTS (fee payments)
-- ============================================================================
INSERT IGNORE INTO payment (id, amount, payment_date, month, call_up_no)
VALUES
(1, 5000.00, '2025-01-15 10:00:00', '2025-01', 'GPSD001'),
(2, 5000.00, '2025-01-20 10:00:00', '2025-01', 'GPSD002'),
(3, 5000.00, '2025-01-18 10:00:00', '2025-01', 'GPSD003'),
(4, 5000.00, '2025-02-15 10:00:00', '2025-02', 'GPSD001'),
(5, 5000.00, '2025-02-20 10:00:00', '2025-02', 'GPSD002'),
(6, 5000.00, '2025-01-22 10:00:00', '2025-01', 'GPSD004'),
(7, 5000.00, '2025-01-25 10:00:00', '2025-01', 'GPSD005');
