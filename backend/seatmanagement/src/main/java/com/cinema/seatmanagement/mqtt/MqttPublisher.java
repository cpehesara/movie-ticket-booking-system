package com.cinema.seatmanagement.mqtt;

import com.cinema.seatmanagement.model.enums.SeatState;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

/**
 * MqttPublisher — bridges Spring Boot seat state changes to ESP32 LED strip.
 *
 * Two-scan IoT flow:
 *   Step 1 (door scan)  → publishGuidingCommand()   → LED WHITE_PULSE (customer walking)
 *   Step 2 (seat scan)  → publishSeatCommand(OCCUPIED) → LED OFF (customer seated ✓)
 *
 * LED color mapping:
 *   AVAILABLE   → GREEN        (seat open for booking)
 *   RESERVED    → YELLOW       (selected, awaiting payment — 7-min TTL)
 *   BOOKED      → BLUE         (payment confirmed, awaiting customer)
 *   OCCUPIED    → OFF          (customer physically seated and confirmed)
 *   MAINTENANCE → WHITE_DIM    (admin blocked, not in use)
 *   CANCELLED   → GREEN        (reverted to available)
 *
 * Special command:
 *   publishGuidingCommand()   → WHITE_PULSE (customer scanned door, walking to seat)
 *
 * Design Patterns:
 *   - Adapter: converts SeatState enum into MQTT JSON payload for ESP32
 *   - Singleton: single MqttPahoMessageHandler bean shared across application
 *
 * @ConditionalOnProperty on MqttConfig means mqttOutboundHandler may be null
 * (MQTT disabled). All methods gracefully log and return in that case.
 */
@Component
@Slf4j
public class MqttPublisher {

    private final MqttPahoMessageHandler mqttOutboundHandler;

    @Autowired
    public MqttPublisher(
            @Autowired(required = false) MqttPahoMessageHandler mqttOutboundHandler
    ) {
        this.mqttOutboundHandler = mqttOutboundHandler;
        if (mqttOutboundHandler == null) {
            log.warn("MQTT is disabled. LED commands will be logged only. " +
                    "Set mqtt.enabled=true in application.yml to enable ESP32 integration.");
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Public API
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Maps a seat state change to an LED color and publishes the MQTT command.
     * Called whenever a seat state transitions.
     *
     * @param screenId  identifies the ESP32 responsible for this screen's LEDs
     * @param ledIndex  0-based position on the WS2812B strip
     * @param seatState current (new) state of the seat
     */
    public void publishSeatCommand(Long screenId, Integer ledIndex, SeatState seatState) {
        String color = mapStateToColor(seatState);
        publish(screenId, ledIndex, color);
    }

    /**
     * Step 1 special command: customer scanned door QR and is walking to seat.
     * Sends WHITE_PULSE so the LED flashes white — a visual beacon guiding
     * the customer through the dark hall to their correct seat.
     *
     * @param screenId  screen whose ESP32 controls the LED
     * @param ledIndex  0-based LED index for the seat
     */
    public void publishGuidingCommand(Long screenId, Integer ledIndex) {
        publish(screenId, ledIndex, "WHITE_PULSE");
    }

    /**
     * Re-syncs ALL LEDs for a screen to match current seat states.
     * Called by admin after an ESP32 reconnects following a power loss.
     *
     * @param screenId   target screen
     * @param seatStates map of ledIndex → SeatState
     */
    public void publishResync(Long screenId, java.util.Map<Integer, SeatState> seatStates) {
        if (mqttOutboundHandler == null) {
            log.debug("MQTT disabled — skipping resync for screenId={}", screenId);
            return;
        }
        seatStates.forEach((ledIndex, state) -> publishSeatCommand(screenId, ledIndex, state));
        log.info("LED resync published for screenId={} ({} seats)", screenId, seatStates.size());
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ────────────────────────────────────────────────────────────────────────

    private void publish(Long screenId, Integer ledIndex, String color) {
        try {
            String topic = String.format("cinema/screen/%s/seat/command", screenId);

            // ESP32 firmware listens for: { action, ledIndex, color }
            String json = String.format(
                    "{\"action\":\"SET_LED\",\"ledIndex\":%d,\"color\":\"%s\"}",
                    ledIndex, color
            );

            if (mqttOutboundHandler == null) {
                log.debug("MQTT disabled — would publish: topic={}, payload={}", topic, json);
                return;
            }

            Message<String> message = MessageBuilder
                    .withPayload(json)
                    .setHeader(MqttHeaders.TOPIC, topic)
                    .setHeader(MqttHeaders.QOS, 1)
                    .build();

            mqttOutboundHandler.handleMessage(message);
            log.info("MQTT published: topic={}, ledIndex={}, color={}", topic, ledIndex, color);

        } catch (Exception e) {
            log.error("Failed to publish MQTT command: screenId={}, ledIndex={}, color={}",
                    screenId, ledIndex, color, e);
        }
    }

    /**
     * Maps SeatState enum to WS2812B LED color string.
     *
     * OCCUPIED maps to OFF because in the IoT flow, LED off = customer seated
     * (confirmed at seat via Step 2). The LED being on means the seat is still
     * awaiting the customer.
     */
    private String mapStateToColor(SeatState state) {
        return switch (state) {
            case AVAILABLE   -> "GREEN";
            case RESERVED    -> "YELLOW";
            case BOOKED      -> "BLUE";
            case OCCUPIED    -> "OFF";           // LED off = customer seated ✓
            case MAINTENANCE -> "WHITE_DIM";
            case CANCELLED   -> "GREEN";
        };
    }
}