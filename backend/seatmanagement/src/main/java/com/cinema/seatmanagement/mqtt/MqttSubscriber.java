package com.cinema.seatmanagement.mqtt;

import com.cinema.seatmanagement.model.repository.KioskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class MqttSubscriber {

    private final MqttPayloadAdapter payloadAdapter;
    private final KioskRepository    kioskRepository;

    /**
     * Receives all inbound MQTT messages from the ESP32 devices.
     * Two message types are expected:
     *
     *   /heartbeat    — ESP32 alive ping every 30s.
     *                   Updates Kiosk.lastSeenAt so the admin dashboard
     *                   can show "Kiosk offline" alerts. The original only
     *                   logged heartbeats — the DB was never updated, making
     *                   KioskRepository.findOfflineKiosks() always return stale data.
     *
     *   /seat/status  — ESP32 confirms a LED state change (optional ACK).
     *                   Parsed and logged; could trigger AuditLog in future.
     *
     * @ServiceActivator(inputChannel = "mqttInputChannel") wires this method
     * into the Spring Integration pipeline configured in MqttConfig.
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        String topic   = message.getHeaders().get("mqtt_receivedTopic", String.class);
        String payload = message.getPayload().toString();

        if (topic == null) {
            log.warn("[MQTT] Received message with null topic — ignored");
            return;
        }

        log.debug("[MQTT] Received: topic={} payload={}", topic, payload);

        if (topic.contains("/heartbeat")) {
            handleHeartbeat(topic);
        } else if (topic.contains("/seat/status")) {
            handleSeatStatus(topic, payload);
        } else {
            log.warn("[MQTT] Unknown topic: {}", topic);
        }
    }

    // ── Private handlers ──────────────────────────────────────────────────

    /**
     * Stamps Kiosk.lastSeenAt via a single bulk UPDATE query — no entity load needed.
     * Resolves the kiosk by its screen's mqttScreenRef extracted from the topic.
     *
     * Topic format: cinema/screen/{mqttScreenRef}/heartbeat
     * Example:      cinema/screen/SCREEN-1-1/heartbeat
     *
     * Kiosk lookup: the subscriber finds the kiosk by screenId (from screen ref).
     * If a screen has multiple kiosks, all are stamped — correct behaviour since
     * a heartbeat from any device on that screen means the screen is alive.
     */
    private void handleHeartbeat(String topic) {
        try {
            String screenRef = extractSegment(topic, 2);  // segment index 2 = "SCREEN-1-1"
            LocalDateTime now = LocalDateTime.now();

            // Find kiosks for this screen ref and update lastSeenAt
            kioskRepository.findByScreenMqttRef(screenRef).forEach(kiosk -> {
                kioskRepository.updateLastSeenAt(kiosk.getId(), now);
                log.debug("[MQTT] Heartbeat stamped: kioskId={} screenRef={}", kiosk.getId(), screenRef);
            });

            log.info("[MQTT] Heartbeat: screenRef={}", screenRef);

        } catch (Exception e) {
            // Heartbeat handling must never crash the subscriber
            log.error("[MQTT] Heartbeat handler error for topic={}: {}", topic, e.getMessage(), e);
        }
    }

    private void handleSeatStatus(String topic, String payload) {
        try {
            MqttPayloadAdapter.SeatStatusPayload status = payloadAdapter.parseSeatStatus(payload);
            log.info("[MQTT] Seat status ACK from ESP32: screenId={} seatId={} ledIndex={} status={}",
                    status.getScreenId(), status.getSeatId(),
                    status.getLedIndex(), status.getStatus());
        } catch (Exception e) {
            log.error("[MQTT] Failed to parse seat status: topic={} payload={}", topic, payload, e);
        }
    }

    /**
     * Extracts a path segment from an MQTT topic by index.
     * Topic: "cinema/screen/SCREEN-1-1/heartbeat"
     * Splits: ["cinema", "screen", "SCREEN-1-1", "heartbeat"]
     */
    private String extractSegment(String topic, int index) {
        String[] parts = topic.split("/");
        if (index >= parts.length) {
            throw new IllegalArgumentException(
                    "Topic segment index " + index + " out of range for topic: " + topic);
        }
        return parts[index];
    }
}