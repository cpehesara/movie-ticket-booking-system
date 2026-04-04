-- V3__add_seat_qr_and_iot_demo.sql
-- Adds permanent per-seat QR code content and a dedicated 6-seat IoT demo screen.
--
-- DESIGN RATIONALE:
--   The seat QR code is a PERMANENT identifier that never changes across movies
--   or showtimes. Its value is the string "SEAT:{seat_id}". The customer scans
--   this at their physical seat to confirm arrival (Step 2 of the two-scan flow).
--   The backend's SeatArrivalServiceImpl strips the prefix and extracts the seatId.
--
--   A dedicated 6-seat IoT demo screen (Screen 3) is created to match the
--   physical hardware: 6 single-color LEDs on GPIO pins 25,26,27,14,12,13.
--   Each seat row_label/col_number maps directly to a physical LED via led_index.

-- ============================================================
-- 1. Add seat_qr_code column to seat table
-- ============================================================
ALTER TABLE seat ADD COLUMN IF NOT EXISTS seat_qr_code VARCHAR(50);

-- ============================================================
-- 2. Populate permanent QR content for ALL existing seats
--    Format: "SEAT:{id}" — parsed by useSeatArrival hook on frontend
-- ============================================================
UPDATE seat SET seat_qr_code = CONCAT('SEAT:', id::TEXT) WHERE seat_qr_code IS NULL;

-- ============================================================
-- 3. IoT Demo Screen — 6 seats, 2 rows x 3 cols
--    Maps to the 6 physical LEDs:
--      led_index 0 → GPIO 25  (A1)
--      led_index 1 → GPIO 26  (A2)
--      led_index 2 → GPIO 27  (A3)
--      led_index 3 → GPIO 14  (B1)
--      led_index 4 → GPIO 12  (B2)
--      led_index 5 → GPIO 13  (B3)
-- ============================================================
INSERT INTO screen (cinema_id, name, total_seats, rows_count, cols_count)
VALUES (1, 'IoT Demo Hall', 6, 2, 3);

-- Seats for IoT Demo Hall (screen_id will be 3 if screens 1 and 2 were inserted in V2)
-- Using a subquery to be safe regardless of sequence gaps
DO $$
DECLARE
    demo_screen_id BIGINT;
BEGIN
    SELECT id INTO demo_screen_id FROM screen WHERE name = 'IoT Demo Hall' LIMIT 1;

    INSERT INTO seat (screen_id, row_label, col_number, seat_type, led_index, is_active)
    VALUES
        (demo_screen_id, 'A', 1, 'STANDARD', 0, true),
        (demo_screen_id, 'A', 2, 'STANDARD', 1, true),
        (demo_screen_id, 'A', 3, 'STANDARD', 2, true),
        (demo_screen_id, 'B', 1, 'STANDARD', 3, true),
        (demo_screen_id, 'B', 2, 'VIP',      4, true),
        (demo_screen_id, 'B', 3, 'VIP',      5, true);

    -- Immediately set the permanent QR codes for the new seats
    UPDATE seat SET seat_qr_code = CONCAT('SEAT:', id::TEXT)
    WHERE screen_id = demo_screen_id AND seat_qr_code IS NULL;
END $$;

-- ============================================================
-- 4. Demo kiosk for the IoT Demo Hall
-- ============================================================
INSERT INTO kiosk (screen_id, api_key, name, is_active)
SELECT id, 'KIOSK-IOT-DEMO-2026-KEY', 'IoT Demo Hall Kiosk', true
FROM screen WHERE name = 'IoT Demo Hall';

-- ============================================================
-- 5. Demo showtime for the IoT Demo Hall (so the frontend can
--    navigate to it and the seat map renders the 6 seats)
-- ============================================================
INSERT INTO showtime (movie_id, screen_id, start_time, end_time, base_price, status)
SELECT
    1,                                              -- The Dark Knight (movie_id=1 from V2)
    s.id,
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '4 hours 32 minutes',
    1500.00,
    'OPEN'
FROM screen s WHERE s.name = 'IoT Demo Hall';