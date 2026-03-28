-- V1__create_all_tables.sql
-- Cinema Hall Seat Management System — Full Schema
-- 14 tables in dependency order

-- ============================================================
-- 1. USERS (no dependencies — foundation of auth)
-- ============================================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(30) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. CINEMA (no dependencies)
-- ============================================================
CREATE TABLE cinema (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    location    VARCHAR(255),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. CUSTOMER_PROFILE (depends on: users)
-- ============================================================
CREATE TABLE customer_profile (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone       VARCHAR(20),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. STAFF_PROFILE (depends on: users, cinema)
-- ============================================================
CREATE TABLE staff_profile (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cinema_id   BIGINT NOT NULL REFERENCES cinema(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. REFRESH_TOKEN (depends on: users)
-- ============================================================
CREATE TABLE refresh_token (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) UNIQUE NOT NULL,
    device_info VARCHAR(255),
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. SCREEN (depends on: cinema)
-- ============================================================
CREATE TABLE screen (
    id          BIGSERIAL PRIMARY KEY,
    cinema_id   BIGINT NOT NULL REFERENCES cinema(id),
    name        VARCHAR(50) NOT NULL,
    total_seats INT NOT NULL,
    rows_count  INT NOT NULL,
    cols_count  INT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 7. KIOSK (depends on: screen)
-- ============================================================
CREATE TABLE kiosk (
    id          BIGSERIAL PRIMARY KEY,
    screen_id   BIGINT NOT NULL REFERENCES screen(id),
    api_key     VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. SEAT (depends on: screen)
-- ============================================================
CREATE TABLE seat (
    id          BIGSERIAL PRIMARY KEY,
    screen_id   BIGINT NOT NULL REFERENCES screen(id),
    row_label   VARCHAR(5) NOT NULL,
    col_number  INT NOT NULL,
    seat_type   VARCHAR(20) DEFAULT 'STANDARD',
    led_index   INT,
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE(screen_id, row_label, col_number)
);

-- ============================================================
-- 9. MOVIE (no dependencies)
-- ============================================================
CREATE TABLE movie (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    duration_mins   INT NOT NULL,
    genre           VARCHAR(50),
    language        VARCHAR(30),
    rating          VARCHAR(10),
    poster_url      VARCHAR(500),
    release_date    DATE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 10. SHOWTIME (depends on: movie, screen)
-- ============================================================
CREATE TABLE showtime (
    id          BIGSERIAL PRIMARY KEY,
    movie_id    BIGINT NOT NULL REFERENCES movie(id),
    screen_id   BIGINT NOT NULL REFERENCES screen(id),
    start_time  TIMESTAMP NOT NULL,
    end_time    TIMESTAMP NOT NULL,
    base_price  DECIMAL(10,2) NOT NULL,
    status      VARCHAR(20) DEFAULT 'SCHEDULED',
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 11. BOOKING (depends on: users, showtime)
-- ============================================================
CREATE TABLE booking (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    showtime_id     BIGINT NOT NULL REFERENCES showtime(id),
    booking_code    VARCHAR(20) UNIQUE NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'PENDING',
    booked_at       TIMESTAMP DEFAULT NOW(),
    checked_in_at   TIMESTAMP,
    version         INT DEFAULT 0
);

-- ============================================================
-- 12. BOOKING_SEAT (depends on: booking, seat, showtime)
-- ============================================================
CREATE TABLE booking_seat (
    id          BIGSERIAL PRIMARY KEY,
    booking_id  BIGINT NOT NULL REFERENCES booking(id),
    seat_id     BIGINT NOT NULL REFERENCES seat(id),
    showtime_id BIGINT NOT NULL REFERENCES showtime(id),
    seat_state  VARCHAR(20) DEFAULT 'RESERVED',
    UNIQUE(seat_id, showtime_id)
);

-- ============================================================
-- 13. PAYMENT (depends on: booking)
-- ============================================================
CREATE TABLE payment (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL REFERENCES booking(id),
    amount          DECIMAL(10,2) NOT NULL,
    payment_method  VARCHAR(30),
    transaction_ref VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'PENDING',
    paid_at         TIMESTAMP
);

-- ============================================================
-- 14. REVIEW (depends on: users, movie)
-- ============================================================
CREATE TABLE review (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    movie_id    BIGINT NOT NULL REFERENCES movie(id),
    rating      INT CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);