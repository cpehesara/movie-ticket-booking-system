package com.cinema.seatmanagement.mqtt;

import com.cinema.seatmanagement.model.enums.SeatState;
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
            log.warn("MQTT is disabled. LED commands will be logged but not sent. Set mqtt.enabled=true to enable.");
        }
    }

    public void publishSeatCommand(Long screenId, Integer ledIndex, SeatState seatState) {
        try {
            String topic = "cinema/screen/" + screenId + "/seat/command";
            String color = mapStateToColor(seatState);

            String json = "{\"action\":\"SET_LED\",\"ledIndex\":" + ledIndex + ",\"color\":\"" + color + "\"}";

            if (mqttOutboundHandler == null) {
                log.debug("MQTT disabled — would send: topic={}, payload={}", topic, json);
                return;
            }

            Message<String> message = MessageBuilder
                    .withPayload(json)
                    .setHeader(MqttHeaders.TOPIC, topic)
                    .setHeader(MqttHeaders.QOS, 1)
                    .build();

            mqttOutboundHandler.handleMessage(message);
            log.info("Published MQTT command: topic={}, ledIndex={}, color={}", topic, ledIndex, color);

        } catch (Exception e) {
            log.error("Failed to publish MQTT seat command: screenId={}, ledIndex={}", screenId, ledIndex, e);
        }
    }

    private String mapStateToColor(SeatState state) {
        return switch (state) {
            case AVAILABLE -> "GREEN";
            case RESERVED -> "YELLOW";
            case BOOKED -> "BLUE";
            case OCCUPIED -> "RED";
            case MAINTENANCE -> "WHITE";
            case CANCELLED -> "GREEN";
        };
    }
}