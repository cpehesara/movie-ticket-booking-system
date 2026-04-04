package com.cinema.seatmanagement.mqtt;

import com.cinema.seatmanagement.model.enums.SeatState;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * MqttPublisherStub — no-op implementation used when mqtt.enabled=false.
 * FIX: Added resyncLed() to match MqttPublisher's public API.
 */
@Component
@ConditionalOnProperty(name = "mqtt.enabled", havingValue = "false", matchIfMissing = true)
@Slf4j
public class MqttPublisherStub {

    public void publishSeatCommand(Long screenId, Integer ledIndex, SeatState newState) {
        log.debug("[MQTT-STUB] publishSeatCommand screenId={} ledIndex={} state={}",
                screenId, ledIndex, newState);
    }

    public void publishResetAll(Long screenId, int totalLeds) {
        log.debug("[MQTT-STUB] publishResetAll screenId={} totalLeds={}", screenId, totalLeds);
    }

    public void publishLedDirectCommand(Long screenId, Integer ledIndex,
                                        String command, String color, Integer blinkHz) {
        log.debug("[MQTT-STUB] publishLedDirectCommand screenId={} ledIndex={} cmd={} color={} blinkHz={}",
                screenId, ledIndex, command, color, blinkHz);
    }

    /**
     * FIX: Added missing resyncLed stub — used by AdminController.resyncLeds()
     * when MQTT is disabled (dev environment).
     */
    public void resyncLed(Long screenId, Integer ledIndex, SeatState state) {
        log.debug("[MQTT-STUB] resyncLed screenId={} ledIndex={} state={}", screenId, ledIndex, state);
    }
}