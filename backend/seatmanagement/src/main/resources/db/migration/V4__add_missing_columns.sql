-- V4__add_missing_columns.sql
-- Adds columns that were added to JPA entities after V1 was written,
-- plus creates the audit_log table that was omitted from V1.
--
-- Flyway runs with validate-on-migrate=true, so every @Column in every
-- @Entity MUST match the DB schema exactly. This migration closes the gaps.

-- ============================================================
-- 1. audit_log table (entity added after V1 was written)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id           BIGSERIAL PRIMARY KEY,
    seat_id      BIGINT REFERENCES seat(id),
    showtime_id  BIGINT REFERENCES showtime(id),
    booking_id   BIGINT REFERENCES booking(id),
    actor_id     BIGINT,
    actor_type   VARCHAR(20),
    action       VARCHAR(40) NOT NULL,
    from_state   VARCHAR(20),
    to_state     VARCHAR(20),
    notes        VARCHAR(500),
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_seat_id      ON audit_log(seat_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_showtime_id  ON audit_log(showtime_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_booking_id   ON audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action       ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_showtime_created ON audit_log(showtime_id, created_at);

-- ============================================================
-- 2. booking table — QR code columns (Booking entity update)
-- ============================================================
ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS qr_code_data  VARCHAR(500),
    ADD COLUMN IF NOT EXISTS qr_code_image TEXT;

-- ============================================================
-- 3. booking_seat table — state_updated_at column
--    (@UpdateTimestamp in BookingSeat entity)
-- ============================================================
ALTER TABLE booking_seat
    ADD COLUMN IF NOT EXISTS state_updated_at TIMESTAMP DEFAULT NOW();

-- Back-fill so existing rows have a non-null value
UPDATE booking_seat SET state_updated_at = NOW() WHERE state_updated_at IS NULL;

-- ============================================================
-- 4. seat table — permanent QR payload + image columns
--    (Seat entity: permanentQrPayload, permanentQrImage)
-- ============================================================
ALTER TABLE seat
    ADD COLUMN IF NOT EXISTS permanent_qr_payload VARCHAR(500),
    ADD COLUMN IF NOT EXISTS permanent_qr_image   TEXT;

-- Back-fill permanent_qr_payload with the simple SEAT:{id} format
-- so existing seats have a valid (legacy) QR payload immediately.
-- The backend QrCodeServiceImpl accepts this legacy format when scanning.
-- Admin can regenerate with full HMAC format via POST /api/admin/seats/{id}/qr
UPDATE seat
SET permanent_qr_payload = CONCAT('SEAT:', id::TEXT)
WHERE permanent_qr_payload IS NULL;
