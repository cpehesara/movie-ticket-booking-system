package com.cinema.seatmanagement.mqtt;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MqttSubscriber {

    private final MqttPayloadAdapter payloadAdapter;

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        String topic = message.getHeaders().get("mqtt_receivedTopic", String.class);
        String payload = message.getPayload().toString();

        log.info("Received MQTT message: topic={}, payload={}", topic, payload);

        if (topic == null) {
            log.warn("Received MQTT message with null topic");
            return;
        }

        if (topic.contains("/heartbeat")) {
            log.debug("ESP32 heartbeat received: topic={}", topic);
        } else if (topic.contains("/seat/status")) {
            try {
                MqttPayloadAdapter.SeatStatusPayload status = payloadAdapter.parseSeatStatus(payload);
                log.info("Seat status from ESP32: seatId={}, status={}", status.getSeatId(), status.getStatus());
            } catch (Exception e) {
                log.error("Failed to parse seat status payload: {}", payload, e);
            }
        } else {
            log.warn("Unknown MQTT topic: {}", topic);
        }
    }
}