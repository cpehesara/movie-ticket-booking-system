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
            log.warn("[MQTT] Disabled — LED commands will be logged only.");
        }
    }

    /**
     * Publishes a SET_LED command to the ESP32.
     *
     * Demo LED state mapping (matches the Arduino sketch's applyLedState()):
     *
     *   AVAILABLE   → "OFF"        LED is off — seat free
     *   RESERVED    → "BLINK_SLOW" Slow blink — seat is reserved, awaiting payment
     *   BOOKED      → "BLINK_SLOW" Slow blink — paid, customer not arrived yet
     *   OCCUPIED    → "BLINK_FAST" Fast blink — customer checked in, guiding to seat!
     *   CANCELLED   → "CONFIRM"    Solid 3s then off — customer confirmed at seat
     *   MAINTENANCE → "ON"         Solid on — seat blocked by admin
     *
     * Note: CANCELLED is repurposed here to trigger the CONFIRM effect because
     * SeatArrivalServiceImpl calls publishSeatCommand(..., SeatState.CANCELLED)
     * as a signal. The booking is immediately set to COMPLETED after that call,
     * so the CANCELLED seat state is never persisted — it is purely a MQTT signal.
     */
    public void publishSeatCommand(Long screenId, Integer ledIndex, SeatState seatState) {
        try {
            String topic      = String.format(AppConstants.MQTT_SEAT_COMMAND_TOPIC, screenId);
            String ledStateStr = mapStateToLedState(seatState);
            String json       = "{\"action\":\"SET_LED\",\"ledIndex\":"
                    + ledIndex + ",\"state\":\"" + ledStateStr + "\"}";

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
            log.info("[MQTT] SET_LED: screenId={} ledIndex={} state={}",
                    screenId, ledIndex, ledStateStr);

        } catch (Exception e) {
            // Never crash the calling service — LED re-syncs on next heartbeat
            log.error("[MQTT] Failed to publish: screenId={} ledIndex={} error={}",
                    screenId, ledIndex, e.getMessage(), e);
        }
    }

    private String mapStateToLedState(SeatState state) {
        return switch (state) {
            case AVAILABLE   -> "OFF";
            case RESERVED    -> "BLINK_SLOW";
            case BOOKED      -> "BLINK_SLOW";
            case OCCUPIED    -> "BLINK_FAST";   // ← fast blink = "find your seat!"
            case CANCELLED   -> "CONFIRM";       // ← repurposed: seat arrival confirmed
            case MAINTENANCE -> "ON";            // ← solid on = blocked
        };
    }
}