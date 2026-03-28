-- V2__seed_demo_data.sql
-- Demo data for development and presentation

-- ============================================================
-- Admin user (password: admin123 — BCrypt hash)
-- ============================================================
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES ('admin@cinema.com', '$2a$12$LJ3m4ys3uz4v4OG9gCBK5eGYq5cMqrGJkNRaBHzUVEbxrE6sLOCWS', 'System Admin', 'ADMIN', true);

-- ============================================================
-- Demo customer (password: customer123)
-- ============================================================
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES ('customer@test.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test Customer', 'CUSTOMER', true);

INSERT INTO customer_profile (user_id, phone)
VALUES (2, '+94771234567');

-- ============================================================
-- Cinema
-- ============================================================
INSERT INTO cinema (name, location)
VALUES ('CinePlex Galle', 'Galle Fort Road, Galle, Sri Lanka');

-- Staff profile for admin
INSERT INTO staff_profile (user_id, cinema_id)
VALUES (1, 1);

-- ============================================================
-- Screens (2 halls)
-- ============================================================
INSERT INTO screen (cinema_id, name, total_seats, rows_count, cols_count)
VALUES (1, 'Hall A', 25, 5, 5);

INSERT INTO screen (cinema_id, name, total_seats, rows_count, cols_count)
VALUES (1, 'Hall B', 30, 5, 6);

-- ============================================================
-- Seats for Hall A (5 rows x 5 cols = 25 seats, LED index 0-24)
-- ============================================================
INSERT INTO seat (screen_id, row_label, col_number, seat_type, led_index, is_active) VALUES
(1, 'A', 1, 'STANDARD', 0, true),
(1, 'A', 2, 'STANDARD', 1, true),
(1, 'A', 3, 'STANDARD', 2, true),
(1, 'A', 4, 'STANDARD', 3, true),
(1, 'A', 5, 'STANDARD', 4, true),
(1, 'B', 1, 'STANDARD', 5, true),
(1, 'B', 2, 'STANDARD', 6, true),
(1, 'B', 3, 'STANDARD', 7, true),
(1, 'B', 4, 'STANDARD', 8, true),
(1, 'B', 5, 'STANDARD', 9, true),
(1, 'C', 1, 'STANDARD', 10, true),
(1, 'C', 2, 'STANDARD', 11, true),
(1, 'C', 3, 'VIP',      12, true),
(1, 'C', 4, 'VIP',      13, true),
(1, 'C', 5, 'STANDARD', 14, true),
(1, 'D', 1, 'STANDARD', 15, true),
(1, 'D', 2, 'STANDARD', 16, true),
(1, 'D', 3, 'VIP',      17, true),
(1, 'D', 4, 'VIP',      18, true),
(1, 'D', 5, 'STANDARD', 19, true),
(1, 'E', 1, 'STANDARD', 20, true),
(1, 'E', 2, 'STANDARD', 21, true),
(1, 'E', 3, 'STANDARD', 22, true),
(1, 'E', 4, 'STANDARD', 23, true),
(1, 'E', 5, 'WHEELCHAIR', 24, true);

-- ============================================================
-- Seats for Hall B (5 rows x 6 cols = 30 seats, LED index 0-29)
-- ============================================================
INSERT INTO seat (screen_id, row_label, col_number, seat_type, led_index, is_active) VALUES
(2, 'A', 1, 'STANDARD', 0, true),
(2, 'A', 2, 'STANDARD', 1, true),
(2, 'A', 3, 'STANDARD', 2, true),
(2, 'A', 4, 'STANDARD', 3, true),
(2, 'A', 5, 'STANDARD', 4, true),
(2, 'A', 6, 'STANDARD', 5, true),
(2, 'B', 1, 'STANDARD', 6, true),
(2, 'B', 2, 'STANDARD', 7, true),
(2, 'B', 3, 'STANDARD', 8, true),
(2, 'B', 4, 'STANDARD', 9, true),
(2, 'B', 5, 'STANDARD', 10, true),
(2, 'B', 6, 'STANDARD', 11, true),
(2, 'C', 1, 'STANDARD', 12, true),
(2, 'C', 2, 'STANDARD', 13, true),
(2, 'C', 3, 'VIP',      14, true),
(2, 'C', 4, 'VIP',      15, true),
(2, 'C', 5, 'STANDARD', 16, true),
(2, 'C', 6, 'STANDARD', 17, true),
(2, 'D', 1, 'STANDARD', 18, true),
(2, 'D', 2, 'STANDARD', 19, true),
(2, 'D', 3, 'VIP',      20, true),
(2, 'D', 4, 'VIP',      21, true),
(2, 'D', 5, 'STANDARD', 22, true),
(2, 'D', 6, 'STANDARD', 23, true),
(2, 'E', 1, 'STANDARD', 24, true),
(2, 'E', 2, 'STANDARD', 25, true),
(2, 'E', 3, 'STANDARD', 26, true),
(2, 'E', 4, 'STANDARD', 27, true),
(2, 'E', 5, 'WHEELCHAIR', 28, true),
(2, 'E', 6, 'WHEELCHAIR', 29, true);

-- ============================================================
-- Movies
-- ============================================================
INSERT INTO movie (title, description, duration_mins, genre, language, rating, release_date)
VALUES (
    'The Dark Knight',
    'When the menace known as the Joker wreaks havoc on Gotham, Batman must face one of the greatest tests.',
    152, 'ACTION', 'English', 'PG-13', '2008-07-18'
);

INSERT INTO movie (title, description, duration_mins, genre, language, rating, release_date)
VALUES (
    'Inception',
    'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea.',
    148, 'SCI-FI', 'English', 'PG-13', '2010-07-16'
);

-- ============================================================
-- Showtimes (upcoming — adjust dates as needed)
-- ============================================================
INSERT INTO showtime (movie_id, screen_id, start_time, end_time, base_price, status)
VALUES (1, 1, NOW() + INTERVAL '1 day' + TIME '10:00', NOW() + INTERVAL '1 day' + TIME '12:32', 1500.00, 'SCHEDULED');

INSERT INTO showtime (movie_id, screen_id, start_time, end_time, base_price, status)
VALUES (1, 1, NOW() + INTERVAL '1 day' + TIME '14:00', NOW() + INTERVAL '1 day' + TIME '16:32', 1500.00, 'SCHEDULED');

INSERT INTO showtime (movie_id, screen_id, start_time, end_time, base_price, status)
VALUES (2, 2, NOW() + INTERVAL '1 day' + TIME '11:00', NOW() + INTERVAL '1 day' + TIME '13:28', 1200.00, 'SCHEDULED');

INSERT INTO showtime (movie_id, screen_id, start_time, end_time, base_price, status)
VALUES (2, 2, NOW() + INTERVAL '1 day' + TIME '16:00', NOW() + INTERVAL '1 day' + TIME '18:28', 1200.00, 'SCHEDULED');

-- ============================================================
-- Kiosk for Hall A
-- ============================================================
INSERT INTO kiosk (screen_id, api_key, name, is_active)
VALUES (1, 'KIOSK-HALL-A-2026-DEMO-KEY', 'Hall A Entrance Kiosk', true);