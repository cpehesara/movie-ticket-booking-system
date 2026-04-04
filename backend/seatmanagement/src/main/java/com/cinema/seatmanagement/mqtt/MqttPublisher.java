package com.cinema.seatmanagement.mqtt;

import com.cinema.seatmanagement.model.enums.SeatState;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.support.MessageBuilder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class MqttPublisher {

    private static final Logger log = LoggerFactory.getLogger(MqttPublisher.class);

    @Autowired(required = false)
    private MqttPahoMessageHandler mqttOutboundHandler;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${mqtt.topic-prefix:cinema}")
    private String topicPrefix;

    public void publishSeatCommand(Long screenId, Integer ledIndex, SeatState newState) {
        if (mqttOutboundHandler == null) {
            log.debug("[MQTT] Disabled — skipping LED command for ledIndex={} state={}", ledIndex, newState);
            return;
        }
        String topic   = topicPrefix + "/" + screenId + "/led";
        String command = toLedCommand(newState);
        String color   = toColor(newState);

        Map<String, Object> payload = new HashMap<>();
        payload.put("ledIndex", ledIndex);
        payload.put("command",  command);
        payload.put("color",    color);
        if ("BLINK".equals(command)) {
            payload.put("blinkHz", 1);
        }

        try {
            String json = objectMapper.writeValueAsString(payload);
            mqttOutboundHandler.handleMessage(
                    MessageBuilder.withPayload(json)
                            .setHeader("mqtt_topic", topic)
                            .setHeader("mqtt_qos", 1)
                            .build()
            );
            log.debug("[MQTT] Published → topic={} payload={}", topic, json);
        } catch (Exception e) {
            log.error("[MQTT] Failed to publish LED command for ledIndex={} state={}: {}",
                    ledIndex, newState, e.getMessage());
        }
    }

    /**
     * FIX: Added missing resyncLed method used by AdminController.resyncLeds().
     * Publishes the current state for a single LED during a resync operation.
     *
     * @param screenId  the screen whose LED strip to update
     * @param ledIndex  the 0-based LED index on the ESP32
     * @param state     the current SeatState to translate into an LED command
     */
    public void resyncLed(Long screenId, Integer ledIndex, SeatState state) {
        publishSeatCommand(screenId, ledIndex, state);
        log.debug("[MQTT] Resync LED → screenId={} ledIndex={} state={}", screenId, ledIndex, state);
    }

    public void publishResetAll(Long screenId, int totalLeds) {
        for (int i = 0; i < totalLeds; i++) {
            publishLedDirectCommand(screenId, i, "OFF", "OFF", null);
        }
        log.info("[MQTT] Reset all {} LEDs for screenId={}", totalLeds, screenId);
    }

    public void publishLedDirectCommand(Long screenId, Integer ledIndex,
                                        String command, String color, Integer blinkHz) {
        if (mqttOutboundHandler == null) {
            log.debug("[MQTT] Disabled — skipping direct command for ledIndex={}", ledIndex);
            return;
        }
        String topic = topicPrefix + "/" + screenId + "/led";
        Map<String, Object> payload = new HashMap<>();
        payload.put("ledIndex", ledIndex);
        payload.put("command",  command);
        payload.put("color",    color);
        if (blinkHz != null) payload.put("blinkHz", blinkHz);

        try {
            String json = objectMapper.writeValueAsString(payload);
            mqttOutboundHandler.handleMessage(
                    MessageBuilder.withPayload(json)
                            .setHeader("mqtt_topic", topic)
                            .setHeader("mqtt_qos", 1)
                            .build()
            );
        } catch (Exception e) {
            log.error("[MQTT] Direct command failed: {}", e.getMessage());
        }
    }

    private String toLedCommand(SeatState state) {
        return switch (state) {
            case GUIDING  -> "ON";
            case OCCUPIED -> "OFF";
            default       -> "OFF";
        };
    }

    private String toColor(SeatState state) {
        return switch (state) {
            case GUIDING  -> "GREEN";
            default       -> "OFF";
        };
    }
}