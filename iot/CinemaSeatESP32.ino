/**
 * ============================================================
 *  CinemaSeatESP32.ino
 *  Cinema Hall Seat Management System — IoT Node
 *  Target: ESP32 Dev Module (30-pin or 38-pin)
 * ============================================================
 *
 * SYSTEM OVERVIEW
 * ---------------
 * This firmware integrates the ESP32 with the Spring Boot backend
 * (com.cinema.seatmanagement) as the physical IoT node for the
 * "IoT Demo Hall" (Screen 3, 6 seats, 2 rows × 3 cols).
 *
 * HARDWARE WIRING (matches V3__add_seat_qr_and_iot_demo.sql)
 * -----------------------------------------------------------
 *  Seat A1 → LED index 0 → GPIO 25
 *  Seat A2 → LED index 1 → GPIO 26
 *  Seat A3 → LED index 2 → GPIO 27
 *  Seat B1 → LED index 3 → GPIO 14
 *  Seat B2 → LED index 4 → GPIO 12
 *  Seat B3 → LED index 5 → GPIO 13
 *
 *  Each LED: GPIO → 220Ω resistor → LED anode → LED cathode → GND
 *
 * LED STATE MAPPING (mirrors SeatState enum in backend)
 * ------------------------------------------------------
 *  AVAILABLE  → LED OFF       (seat is free)
 *  RESERVED   → LED BLINK     (booking pending/confirmed, not yet checked in)
 *  GUIDING    → LED ON solid  (customer checked in at door, LED guides to seat)
 *  OCCUPIED   → LED OFF       (customer seated, confirmed arrival via seat QR scan)
 *  BLOCKED    → LED OFF       (disabled/not in use)
 *
 * PROTOCOLS
 * ---------
 *  1. MQTT  — Primary real-time channel
 *     Broker: configured below
 *     Subscribe: cinema/screen/{SCREEN_ID}/leds  (JSON commands from backend)
 *     Publish:   cinema/esp32/{SCREEN_ID}/status  (heartbeat + state echo)
 *
 *  2. HTTP REST — Startup sync + fallback resync
 *     GET  /api/seats/{showtimeId}   → initial seat map on boot
 *     (Uses kiosk API key header: X-API-Key)
 *
 *  3. WebSocket (STOMP) — Real-time seat-state updates (alternative to MQTT)
 *     ws://{SERVER_HOST}/ws  → /topic/seats/{showtimeId}
 *
 * MQTT PAYLOAD FORMAT (published by MqttPublisher.java in backend)
 * ----------------------------------------------------------------
 *  Single LED command:
 *    Topic: cinema/screen/3/leds
 *    Payload: {"ledIndex":2,"state":"GUIDING"}
 *
 *  Bulk reset command:
 *    Topic: cinema/screen/3/leds
 *    Payload: {"action":"RESET_ALL"}
 *
 *  Resync command (from POST /api/admin/seats/resync-leds/{showtimeId}):
 *    Payload: {"action":"RESYNC","states":[{"ledIndex":0,"state":"RESERVED"}, ...]}
 *
 * LIBRARIES REQUIRED (install via Arduino Library Manager)
 * --------------------------------------------------------
 *  - WiFi          (built-in ESP32)
 *  - HTTPClient    (built-in ESP32)
 *  - ArduinoJson   by Benoit Blanchon  ≥ 6.x
 *  - PubSubClient  by Nick O'Leary     ≥ 2.8
 *
 * BOARD SETTINGS (Arduino IDE)
 * ----------------------------
 *  Board:      ESP32 Dev Module
 *  Upload Speed: 921600
 *  CPU Freq:   240 MHz
 *  Flash Size: 4MB
 *  Port:       your COM/tty port
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

// ============================================================
//  USER CONFIGURATION — edit these for your environment
// ============================================================

// --- WiFi ---
const char* WIFI_SSID     = "SLT_FIBER_89ewG";
const char* WIFI_PASSWORD = "3dSx8eRy";

// --- Spring Boot backend ---
const char* SERVER_HOST   = "192.168.1.7";   // IP of your Spring Boot server
const int   SERVER_PORT   = 8080;
const char* KIOSK_API_KEY = "KIOSK-IOT-DEMO-2026-KEY";  // matches V3 seed data

// --- Screen / Showtime (IoT Demo Hall from V3 migration) ---
const int   SCREEN_ID     = 3;   // IoT Demo Hall screen_id
const int   SHOWTIME_ID   = 5;   // adjust to the active showtime_id in your DB

// --- MQTT Broker ---
const char* MQTT_BROKER   = "192.168.1.7";  // can be same host or a dedicated broker
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "";               // leave blank if no auth
const char* MQTT_PASS     = "";
const char* MQTT_CLIENT_ID = "esp32-cinema-screen3";

// ============================================================
//  PIN DEFINITIONS  (matches V3 led_index → GPIO mapping)
// ============================================================
const int LED_COUNT = 6;
const int LED_PINS[LED_COUNT] = {25, 26, 27, 14, 12, 13};

// ============================================================
//  SEAT STATE ENUM  (mirrors backend SeatState.java)
// ============================================================
enum SeatState {
    STATE_AVAILABLE,
    STATE_RESERVED,
    STATE_GUIDING,
    STATE_OCCUPIED,
    STATE_BLOCKED,
    STATE_UNKNOWN
};

// ============================================================
//  GLOBAL STATE
// ============================================================
SeatState ledStates[LED_COUNT];
bool      blinkPhase        = false;
unsigned long lastBlinkMs   = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastResyncMs  = 0;

const unsigned long BLINK_INTERVAL_MS     = 500;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;  // 30s heartbeat to MQTT
const unsigned long RESYNC_INTERVAL_MS    = 300000; // 5-min fallback REST resync

// ============================================================
//  MQTT / WiFi CLIENT OBJECTS
// ============================================================
WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);

// MQTT topics
char MQTT_SUB_TOPIC[64];   // cinema/screen/3/leds
char MQTT_PUB_TOPIC[64];   // cinema/esp32/3/status

// ============================================================
//  FORWARD DECLARATIONS
// ============================================================
void connectWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void applyState(int ledIndex, SeatState state);
void updateLeds();
SeatState parseState(const char* stateStr);
bool fetchInitialSeatMap();
void publishHeartbeat();
void publishStateEcho();
void handleResync(JsonArray& states);
void printBanner();

// ============================================================
//  SETUP
// ============================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    printBanner();

    // Initialise LED pins and state array
    for (int i = 0; i < LED_COUNT; i++) {
        pinMode(LED_PINS[i], OUTPUT);
        digitalWrite(LED_PINS[i], LOW);
        ledStates[i] = STATE_AVAILABLE;
    }

    // Build MQTT topic strings
    snprintf(MQTT_SUB_TOPIC, sizeof(MQTT_SUB_TOPIC),
             "cinema/screen/%d/leds", SCREEN_ID);
    snprintf(MQTT_PUB_TOPIC, sizeof(MQTT_PUB_TOPIC),
             "cinema/esp32/%d/status", SCREEN_ID);

    // Connect WiFi
    connectWiFi();

    // Configure MQTT
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(1024);  // larger buffer for RESYNC payloads

    // Connect MQTT
    connectMQTT();

    // Bootstrap: fetch current seat map from REST API
    Serial.println("[BOOT] Fetching initial seat map from REST API...");
    if (!fetchInitialSeatMap()) {
        Serial.println("[BOOT] REST fetch failed — LEDs stay dark until MQTT update");
    }

    Serial.println("[BOOT] Ready. Listening for MQTT commands.");
    Serial.printf("[BOOT] Subscribe topic: %s\n", MQTT_SUB_TOPIC);
    Serial.printf("[BOOT] Publish  topic:  %s\n", MQTT_PUB_TOPIC);
}

// ============================================================
//  MAIN LOOP
// ============================================================
void loop() {
    // Ensure WiFi stays connected
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[LOOP] WiFi lost — reconnecting...");
        connectWiFi();
    }

    // Ensure MQTT stays connected
    if (!mqttClient.connected()) {
        connectMQTT();
    }
    mqttClient.loop();

    unsigned long now = millis();

    // Blink tick — drives RESERVED state blinking
    if (now - lastBlinkMs >= BLINK_INTERVAL_MS) {
        lastBlinkMs = now;
        blinkPhase  = !blinkPhase;
        updateLeds();
    }

    // Heartbeat publish
    if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = now;
        publishHeartbeat();
    }

    // Fallback REST resync (handles MQTT missed messages after reconnect)
    if (now - lastResyncMs >= RESYNC_INTERVAL_MS) {
        lastResyncMs = now;
        Serial.println("[RESYNC] Periodic REST resync...");
        fetchInitialSeatMap();
    }
}

// ============================================================
//  WIFI
// ============================================================
void connectWiFi() {
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Connection FAILED — will retry in loop");
    }
}

// ============================================================
//  MQTT CONNECT
// ============================================================
void connectMQTT() {
    Serial.printf("[MQTT] Connecting to %s:%d...\n", MQTT_BROKER, MQTT_PORT);

    int attempts = 0;
    while (!mqttClient.connected() && attempts < 5) {
        bool connected;
        if (strlen(MQTT_USER) > 0) {
            connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
        } else {
            connected = mqttClient.connect(MQTT_CLIENT_ID);
        }

        if (connected) {
            Serial.println("[MQTT] Connected!");
            mqttClient.subscribe(MQTT_SUB_TOPIC);
            Serial.printf("[MQTT] Subscribed to: %s\n", MQTT_SUB_TOPIC);

            // Announce online status
            StaticJsonDocument<128> onlineDoc;
            onlineDoc["event"]    = "CONNECTED";
            onlineDoc["screenId"] = SCREEN_ID;
            onlineDoc["ip"]       = WiFi.localIP().toString();
            char onlineBuf[128];
            serializeJson(onlineDoc, onlineBuf);
            mqttClient.publish(MQTT_PUB_TOPIC, onlineBuf, true); // retained
        } else {
            Serial.printf("[MQTT] Failed (rc=%d) — retry %d/5\n",
                          mqttClient.state(), attempts + 1);
            delay(2000);
        }
        attempts++;
    }
}

// ============================================================
//  MQTT CALLBACK — called when a message arrives on subscribed topic
// ============================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    // Null-terminate the payload
    char buf[1024];
    unsigned int copyLen = min(length, (unsigned int)(sizeof(buf) - 1));
    memcpy(buf, payload, copyLen);
    buf[copyLen] = '\0';

    Serial.printf("[MQTT] Received on %s: %s\n", topic, buf);

    StaticJsonDocument<1024> doc;
    DeserializationError err = deserializeJson(doc, buf);
    if (err) {
        Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
        return;
    }

    // ── RESET_ALL ────────────────────────────────────────────
    if (doc.containsKey("action")) {
        const char* action = doc["action"];

        if (strcmp(action, "RESET_ALL") == 0) {
            Serial.println("[CMD] RESET_ALL — turning off all LEDs");
            for (int i = 0; i < LED_COUNT; i++) {
                ledStates[i] = STATE_AVAILABLE;
            }
            updateLeds();
            publishStateEcho();
            return;
        }

        // ── RESYNC ───────────────────────────────────────────
        if (strcmp(action, "RESYNC") == 0) {
            Serial.println("[CMD] RESYNC — applying full state array");
            if (doc.containsKey("states")) {
                JsonArray states = doc["states"].as<JsonArray>();
                handleResync(states);
            }
            publishStateEcho();
            return;
        }
    }

    // ── SINGLE LED COMMAND ───────────────────────────────────
    // Payload: {"ledIndex":2,"state":"GUIDING"}
    if (doc.containsKey("ledIndex") && doc.containsKey("state")) {
        int ledIndex        = doc["ledIndex"];
        const char* stateStr = doc["state"];

        if (ledIndex < 0 || ledIndex >= LED_COUNT) {
            Serial.printf("[CMD] Invalid ledIndex: %d\n", ledIndex);
            return;
        }

        SeatState newState = parseState(stateStr);
        applyState(ledIndex, newState);
        updateLeds();

        Serial.printf("[CMD] LED[%d] (GPIO %d) → %s\n",
                      ledIndex, LED_PINS[ledIndex], stateStr);

        publishStateEcho();
        return;
    }

    Serial.println("[MQTT] Unknown command format — ignored");
}

// ============================================================
//  APPLY STATE + UPDATE PHYSICAL LEDS
// ============================================================
void applyState(int ledIndex, SeatState state) {
    if (ledIndex < 0 || ledIndex >= LED_COUNT) return;
    ledStates[ledIndex] = state;
}

/**
 * Write physical GPIO levels based on current state + blink phase.
 *
 * AVAILABLE  → LOW  (off)
 * RESERVED   → blinkPhase toggles HIGH/LOW (500ms blink)
 * GUIDING    → HIGH (solid on — guide customer to seat)
 * OCCUPIED   → LOW  (off — customer is seated)
 * BLOCKED    → LOW  (off)
 * UNKNOWN    → LOW  (safe default)
 */
void updateLeds() {
    for (int i = 0; i < LED_COUNT; i++) {
        int level;
        switch (ledStates[i]) {
            case STATE_RESERVED: level = blinkPhase ? HIGH : LOW; break;
            case STATE_GUIDING:  level = HIGH;                    break;
            default:             level = LOW;                     break;
        }
        digitalWrite(LED_PINS[i], level);
    }
}

// ============================================================
//  PARSE STATE STRING → ENUM
// ============================================================
SeatState parseState(const char* s) {
    if (strcmp(s, "AVAILABLE") == 0) return STATE_AVAILABLE;
    if (strcmp(s, "RESERVED")  == 0) return STATE_RESERVED;
    if (strcmp(s, "GUIDING")   == 0) return STATE_GUIDING;
    if (strcmp(s, "OCCUPIED")  == 0) return STATE_OCCUPIED;
    if (strcmp(s, "BLOCKED")   == 0) return STATE_BLOCKED;
    return STATE_UNKNOWN;
}

const char* stateToString(SeatState s) {
    switch (s) {
        case STATE_AVAILABLE: return "AVAILABLE";
        case STATE_RESERVED:  return "RESERVED";
        case STATE_GUIDING:   return "GUIDING";
        case STATE_OCCUPIED:  return "OCCUPIED";
        case STATE_BLOCKED:   return "BLOCKED";
        default:              return "UNKNOWN";
    }
}

// ============================================================
//  RESYNC — apply a full array of {ledIndex, state} objects
// ============================================================
void handleResync(JsonArray& states) {
    for (JsonObject entry : states) {
        int ledIndex        = entry["ledIndex"] | -1;
        const char* stateStr = entry["state"]   | "UNKNOWN";
        if (ledIndex >= 0 && ledIndex < LED_COUNT) {
            ledStates[ledIndex] = parseState(stateStr);
            Serial.printf("[RESYNC] LED[%d] → %s\n", ledIndex, stateStr);
        }
    }
    updateLeds();
}

// ============================================================
//  REST — Fetch initial seat map on boot
//  GET /api/seats/{showtimeId}
//  Response parsed to extract seat states → led_index mapping
// ============================================================
bool fetchInitialSeatMap() {
    if (WiFi.status() != WL_CONNECTED) return false;

    char url[200];
    snprintf(url, sizeof(url), "http://%s:%d/api/seats/%d",
             SERVER_HOST, SERVER_PORT, SHOWTIME_ID);

    HTTPClient http;
    http.begin(url);
    http.addHeader("X-API-Key", KIOSK_API_KEY);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(8000);

    Serial.printf("[REST] GET %s\n", url);
    int httpCode = http.GET();

    if (httpCode != 200) {
        Serial.printf("[REST] HTTP error: %d\n", httpCode);
        http.end();
        return false;
    }

    String body = http.getString();
    http.end();

    // Parse the SeatMapResponse JSON
    // Expected shape: { "seats": [ { "seatId":1, "ledIndex":0, "seatState":"RESERVED" }, ... ] }
    DynamicJsonDocument doc(4096);
    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        Serial.printf("[REST] JSON parse error: %s\n", err.c_str());
        return false;
    }

    JsonArray seats = doc["seats"].as<JsonArray>();
    if (seats.isNull()) {
        Serial.println("[REST] No 'seats' array in response");
        return false;
    }

    int updated = 0;
    for (JsonObject seat : seats) {
        int ledIndex        = seat["ledIndex"]  | -1;
        const char* state   = seat["seatState"] | "AVAILABLE";
        if (ledIndex >= 0 && ledIndex < LED_COUNT) {
            ledStates[ledIndex] = parseState(state);
            updated++;
        }
    }

    updateLeds();
    Serial.printf("[REST] Seat map applied — %d LEDs updated\n", updated);
    return true;
}

// ============================================================
//  PUBLISH HEARTBEAT
// ============================================================
void publishHeartbeat() {
    StaticJsonDocument<256> doc;
    doc["event"]    = "HEARTBEAT";
    doc["screenId"] = SCREEN_ID;
    doc["uptime"]   = millis() / 1000;
    doc["ip"]       = WiFi.localIP().toString();
    doc["rssi"]     = WiFi.RSSI();

    char buf[256];
    serializeJson(doc, buf);
    mqttClient.publish(MQTT_PUB_TOPIC, buf);
    Serial.printf("[HEARTBEAT] Published — uptime=%lus RSSI=%ddBm\n",
                  millis() / 1000, WiFi.RSSI());
}

// ============================================================
//  PUBLISH STATE ECHO — after any state change
// ============================================================
void publishStateEcho() {
    StaticJsonDocument<512> doc;
    doc["event"]    = "STATE_ECHO";
    doc["screenId"] = SCREEN_ID;

    JsonArray arr = doc.createNestedArray("leds");
    for (int i = 0; i < LED_COUNT; i++) {
        JsonObject led = arr.createNestedObject();
        led["ledIndex"] = i;
        led["gpio"]     = LED_PINS[i];
        led["state"]    = stateToString(ledStates[i]);
    }

    char buf[512];
    serializeJson(doc, buf);
    mqttClient.publish(MQTT_PUB_TOPIC, buf);
}

// ============================================================
//  BOOT BANNER
// ============================================================
void printBanner() {
    Serial.println();
    Serial.println("╔══════════════════════════════════════════════╗");
    Serial.println("║   CinemaSeat ESP32 IoT Node                  ║");
    Serial.println("║   CinePlex Galle — IoT Demo Hall (Screen 3)  ║");
    Serial.println("║   6 Seats  |  MQTT + REST  |  LED Control    ║");
    Serial.println("╚══════════════════════════════════════════════╝");
    Serial.println();
    Serial.println("LED PIN MAP:");
    Serial.println("  Seat A1 (LED 0) → GPIO 25");
    Serial.println("  Seat A2 (LED 1) → GPIO 26");
    Serial.println("  Seat A3 (LED 2) → GPIO 27");
    Serial.println("  Seat B1 (LED 3) → GPIO 14");
    Serial.println("  Seat B2 (LED 4) → GPIO 12");
    Serial.println("  Seat B3 (LED 5) → GPIO 13");
    Serial.println();
}
