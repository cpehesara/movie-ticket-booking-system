-- V3__production_enhancements.sql
-- Adds every column, index, constraint, and table introduced in the entity optimisation pass.
-- All changes are ADDITIVE — no existing columns/tables are dropped or renamed.
-- Safe to run against a live DB that already has V1 + V2 applied.

-- ============================================================
-- cinema: contact details + soft-delete
-- ============================================================
ALTER TABLE cinema
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE;

UPDATE cinema SET is_active = TRUE WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_cinema_name ON cinema(name);

-- ============================================================
-- screen: stable MQTT reference + soft-delete
-- ============================================================
ALTER TABLE screen
    ADD COLUMN IF NOT EXISTS mqtt_screen_ref VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS is_active        BOOLEAN DEFAULT TRUE;

UPDATE screen SET is_active = TRUE WHERE is_active IS NULL;

-- Back-fill mqtt_screen_ref for existing rows: "SCREEN-{id}-{cinema_id}"
UPDATE screen
SET mqtt_screen_ref = CONCAT('SCREEN-', id, '-', cinema_id)
WHERE mqtt_screen_ref IS NULL;

-- Make non-nullable now that every row has a value
ALTER TABLE screen
    ALTER COLUMN mqtt_screen_ref SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_screen_cinema_id ON screen(cinema_id);
CREATE INDEX IF NOT EXISTS idx_screen_name      ON screen(name);

-- ============================================================
-- seat: indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_seat_screen_id ON seat(screen_id);
CREATE INDEX IF NOT EXISTS idx_seat_is_active  ON seat(is_active);
CREATE INDEX IF NOT EXISTS idx_seat_seat_type  ON seat(seat_type);

-- ============================================================
-- movie: trailer_url, is_active, indexes
-- ============================================================
ALTER TABLE movie
    ADD COLUMN IF NOT EXISTS trailer_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;

UPDATE movie SET is_active = TRUE WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_movie_genre        ON movie(genre);
CREATE INDEX IF NOT EXISTS idx_movie_language     ON movie(language);
CREATE INDEX IF NOT EXISTS idx_movie_release_date ON movie(release_date);
CREATE INDEX IF NOT EXISTS idx_movie_is_active    ON movie(is_active);

-- ============================================================
-- showtime: indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_showtime_movie_id    ON showtime(movie_id);
CREATE INDEX IF NOT EXISTS idx_showtime_screen_id   ON showtime(screen_id);
CREATE INDEX IF NOT EXISTS idx_showtime_start_time  ON showtime(start_time);
CREATE INDEX IF NOT EXISTS idx_showtime_status      ON showtime(status);
CREATE INDEX IF NOT EXISTS idx_showtime_movie_status ON showtime(movie_id, status);

-- ============================================================
-- booking: indexes (status+booked_at composite is the critical one)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_booking_user_id          ON booking(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_showtime_id      ON booking(showtime_id);
CREATE INDEX IF NOT EXISTS idx_booking_status           ON booking(status);
CREATE INDEX IF NOT EXISTS idx_booking_booked_at        ON booking(booked_at);
CREATE INDEX IF NOT EXISTS idx_booking_status_booked_at ON booking(status, booked_at);

-- ============================================================
-- booking_seat: state_updated_at + indexes
-- ============================================================
ALTER TABLE booking_seat
    ADD COLUMN IF NOT EXISTS state_updated_at TIMESTAMP DEFAULT NOW();

UPDATE booking_seat SET state_updated_at = NOW() WHERE state_updated_at IS NULL;

-- Rename unnamed UNIQUE constraint to a named one (safe: constraint still exists)
-- PostgreSQL won't error if the name already matches; the DO block makes it idempotent.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_booking_seat_seat_showtime'
    ) THEN
        ALTER TABLE booking_seat
            ADD CONSTRAINT uq_booking_seat_seat_showtime UNIQUE (seat_id, showtime_id);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_booking_seat_booking_id      ON booking_seat(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_seat_showtime_id     ON booking_seat(showtime_id);
CREATE INDEX IF NOT EXISTS idx_booking_seat_seat_id         ON booking_seat(seat_id);
CREATE INDEX IF NOT EXISTS idx_booking_seat_state           ON booking_seat(seat_state);
CREATE INDEX IF NOT EXISTS idx_booking_seat_showtime_state  ON booking_seat(showtime_id, seat_state);

-- ============================================================
-- payment: payment_method as VARCHAR (now backed by enum in Java),
--          failure_reason, unique transaction_ref
-- ============================================================
ALTER TABLE payment
    ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(255);

-- Make transaction_ref unique if not already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payment_transaction_ref_key'
           OR conname = 'uq_payment_transaction_ref'
    ) THEN
        ALTER TABLE payment ADD CONSTRAINT uq_payment_transaction_ref UNIQUE (transaction_ref);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_payment_booking_id      ON payment(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_status          ON payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_ref ON payment(transaction_ref);

-- ============================================================
-- refresh_token: indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id    ON refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires_at ON refresh_token(expires_at);

-- ============================================================
-- review: one-review-per-user-per-movie constraint + indexes
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_review_user_movie'
    ) THEN
        ALTER TABLE review ADD CONSTRAINT uq_review_user_movie UNIQUE (user_id, movie_id);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_review_movie_id ON review(movie_id);
CREATE INDEX IF NOT EXISTS idx_review_user_id  ON review(user_id);
CREATE INDEX IF NOT EXISTS idx_review_rating   ON review(rating);

-- ============================================================
-- customer_profile: loyalty_points + index
-- ============================================================
ALTER TABLE customer_profile
    ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;

UPDATE customer_profile SET loyalty_points = 0 WHERE loyalty_points IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_profile_user_id ON customer_profile(user_id);

-- ============================================================
-- staff_profile: indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_staff_profile_user_id   ON staff_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profile_cinema_id ON staff_profile(cinema_id);

-- ============================================================
-- kiosk: last_seen_at + updated_at + indexes
-- ============================================================
ALTER TABLE kiosk
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_kiosk_screen_id ON kiosk(screen_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_is_active ON kiosk(is_active);

-- ============================================================
-- users: indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================================
-- NEW TABLE: audit_log
-- Write-once immutable trail for every seat state transition.
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id           BIGSERIAL PRIMARY KEY,
    seat_id      BIGINT REFERENCES seat(id),
    showtime_id  BIGINT REFERENCES showtime(id),
    booking_id   BIGINT REFERENCES booking(id),
    actor_id     BIGINT,
    actor_type   VARCHAR(20),                         -- USER | KIOSK | SYSTEM
    action       VARCHAR(40) NOT NULL,
    from_state   VARCHAR(20),
    to_state     VARCHAR(20),
    notes        VARCHAR(500),
    created_at   TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Partitioning hint: on a very high-volume installation, range-partition
-- audit_log by created_at month. The indexes below are sufficient for
-- the demo / university environment.
CREATE INDEX IF NOT EXISTS idx_audit_log_seat_id         ON audit_log(seat_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_showtime_id     ON audit_log(showtime_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_booking_id      ON audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at      ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action          ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_showtime_created ON audit_log(showtime_id, created_at);