package com.cinema.seatmanagement.util;

public final class AppConstants {

    private AppConstants() {}

    // ── JWT / Auth headers ────────────────────────────────────────────────
    public static final String AUTH_HEADER      = "Authorization";
    public static final String BEARER_PREFIX    = "Bearer ";
    public static final String API_KEY_HEADER   = "X-API-Key";

    // ── Roles ─────────────────────────────────────────────────────────────
    public static final String ROLE_CUSTOMER = "ROLE_CUSTOMER";
    public static final String ROLE_ADMIN    = "ROLE_ADMIN";
    public static final String ROLE_MANAGER  = "ROLE_MANAGER";
    public static final String ROLE_OPERATOR = "ROLE_OPERATOR";
    public static final String ROLE_KIOSK    = "ROLE_KIOSK";

    // ── WebSocket ─────────────────────────────────────────────────────────
    public static final String WS_ENDPOINT        = "/ws";
    public static final String SEAT_TOPIC_PREFIX  = "/topic/seats/";
    public static final String ADMIN_ALERT_TOPIC  = "/topic/admin/alerts";
    public static final String IOT_TOPIC_PREFIX   = "/topic/iot/";

    // ── MQTT Topics (use String.format with screenId) ─────────────────────
    public static final String MQTT_SEAT_COMMAND_TOPIC = "cinema/screen/%s/seat/command";
    public static final String MQTT_SEAT_STATUS_TOPIC  = "cinema/screen/%s/seat/status";
    public static final String MQTT_HEARTBEAT_TOPIC    = "cinema/screen/%s/heartbeat";

    /** Wildcard subscriptions used by the inbound MQTT adapter */
    public static final String MQTT_SEAT_STATUS_WILDCARD = "cinema/+/seat/status";
    public static final String MQTT_HEARTBEAT_WILDCARD   = "cinema/+/heartbeat";

    // ── Booking ───────────────────────────────────────────────────────────
    public static final String BOOKING_CODE_PREFIX = "BK-";
    public static final int    BOOKING_CODE_LENGTH = 8;

    /** Regex used by @Pattern on CheckinRequest.bookingCode */
    public static final String BOOKING_CODE_REGEX  = "^BK-[A-Z0-9]{8}$";

    /** Max seats selectable in a single booking — matches @Size on CreateBookingRequest */
    public static final int    MAX_SEATS_PER_BOOKING = 10;

    // ── LED Colors — match ESP32 firmware color strings ───────────────────
    public static final String LED_GREEN  = "GREEN";
    public static final String LED_YELLOW = "YELLOW";
    public static final String LED_BLUE   = "BLUE";
    public static final String LED_RED    = "RED";
    public static final String LED_WHITE  = "WHITE";

    // ── Actor types — used in AuditLog.actorType ─────────────────────────
    public static final String ACTOR_USER   = "USER";
    public static final String ACTOR_KIOSK  = "KIOSK";
    public static final String ACTOR_SYSTEM = "SYSTEM";

    // ── Kiosk heartbeat ───────────────────────────────────────────────────
    /** Kiosks that haven't sent a heartbeat within this many minutes are "offline" */
    public static final int KIOSK_OFFLINE_THRESHOLD_MINUTES = 2;
}