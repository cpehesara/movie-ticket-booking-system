package com.cinema.seatmanagement.mqtt;

import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.util.AppConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

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
            log.warn("[MQTT] Disabled — LED commands will be logged only. Set mqtt.enabled=true to activate.");
        }
    }

    /**
     * Publishes a SET_LED command to the ESP32 firmware over MQTT.
     *
     * Topic: cinema/screen/{screenId}/seat/command  (from AppConstants)
     * Payload: {"action":"SET_LED","ledIndex":N,"color":"GREEN"}
     *
     * Color constants come from AppConstants to ensure they match the
     * firmware's expected strings exactly — no typos in individual service classes.
     *
     * @param screenId  DB id of the screen (used as MQTT topic segment)
     * @param ledIndex  0-based LED position on the WS2812B strip
     * @param seatState current seat state — determines LED color
     */
    public void publishSeatCommand(Long screenId, Integer ledIndex, SeatState seatState) {
        try {
            String topic = String.format(AppConstants.MQTT_SEAT_COMMAND_TOPIC, screenId);
            String color = mapStateToColor(seatState);
            String json  = "{\"action\":\"SET_LED\",\"ledIndex\":"
                    + ledIndex + ",\"color\":\"" + color + "\"}";

            if (mqttOutboundHandler == null) {
                log.debug("[MQTT] Disabled — would publish: topic={} payload={}", topic, json);
                return;
            }

            Message<String> message = MessageBuilder
                    .withPayload(json)
                    .setHeader(MqttHeaders.TOPIC, topic)
                    .setHeader(MqttHeaders.QOS, 1)
                    .build();

            mqttOutboundHandler.handleMessage(message);
            log.info("[MQTT] Published SET_LED: screenId={} ledIndex={} color={}", screenId, ledIndex, color);

        } catch (Exception e) {
            // Never crash the calling service — MQTT failures are logged, not propagated.
            // Seat state change has already been persisted; LED will re-sync on next heartbeat.
            log.error("[MQTT] Failed to publish seat command: screenId={} ledIndex={} error={}",
                    screenId, ledIndex, e.getMessage(), e);
        }
    }

    /**
     * Maps SeatState to the LED color string expected by the ESP32 firmware.
     * Uses AppConstants to keep the strings in one place.
     *
     * CANCELLED uses GREEN (same as AVAILABLE) — a cancelled seat is open for
     * a new booking; showing RED would be misleading to customers in the hall.
     */
    private String mapStateToColor(SeatState state) {
        return switch (state) {
            case AVAILABLE   -> AppConstants.LED_GREEN;
            case RESERVED    -> AppConstants.LED_YELLOW;
            case BOOKED      -> AppConstants.LED_BLUE;
            case OCCUPIED    -> AppConstants.LED_RED;
            case MAINTENANCE -> AppConstants.LED_WHITE;
            case CANCELLED   -> AppConstants.LED_GREEN;
        };
    }
}