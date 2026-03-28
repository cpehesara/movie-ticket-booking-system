package com.cinema.seatmanagement.util;

public final class AppConstants {

    private AppConstants() {
        // Prevent instantiation
    }

    // ── JWT ──
    public static final String AUTH_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";
    public static final String API_KEY_HEADER = "X-API-Key";

    // ── Roles ──
    public static final String ROLE_CUSTOMER = "ROLE_CUSTOMER";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_MANAGER = "ROLE_MANAGER";
    public static final String ROLE_OPERATOR = "ROLE_OPERATOR";
    public static final String ROLE_KIOSK = "ROLE_KIOSK";

    // ── WebSocket ──
    public static final String WS_ENDPOINT = "/ws";
    public static final String SEAT_TOPIC_PREFIX = "/topic/seats/";

    // ── MQTT Topics ──
    public static final String MQTT_SEAT_COMMAND_TOPIC = "cinema/screen/%s/seat/command";
    public static final String MQTT_SEAT_STATUS_TOPIC = "cinema/screen/%s/seat/status";
    public static final String MQTT_HEARTBEAT_TOPIC = "cinema/screen/%s/heartbeat";

    // ── Booking ──
    public static final String BOOKING_CODE_PREFIX = "BK-";
    public static final int BOOKING_CODE_LENGTH = 8;

    // ── LED Colors ──
    public static final String LED_GREEN = "GREEN";
    public static final String LED_YELLOW = "YELLOW";
    public static final String LED_BLUE = "BLUE";
    public static final String LED_RED = "RED";
    public static final String LED_WHITE = "WHITE";
}