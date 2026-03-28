package com.cinema.seatmanagement.mqtt;

import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MqttPayloadAdapter {

    public SeatStatusPayload parseSeatStatus(String json) {
        try {
            SeatStatusPayload payload = new SeatStatusPayload();

            json = json.trim();
            if (json.startsWith("{")) json = json.substring(1);
            if (json.endsWith("}")) json = json.substring(0, json.length() - 1);

            for (String pair : json.split(",")) {
                String[] kv = pair.split(":", 2);
                if (kv.length != 2) continue;

                String key = kv[0].trim().replace("\"", "");
                String value = kv[1].trim().replace("\"", "");

                switch (key) {
                    case "seatId" -> payload.setSeatId(Long.parseLong(value));
                    case "ledIndex" -> payload.setLedIndex(Integer.parseInt(value));
                    case "status" -> payload.setStatus(value);
                    case "screenId" -> payload.setScreenId(Long.parseLong(value));
                }
            }
            return payload;

        } catch (Exception e) {
            log.error("Failed to parse MQTT seat status payload: {}", json, e);
            throw new RuntimeException("Invalid MQTT payload format", e);
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SeatStatusPayload {
        private Long seatId;
        private Integer ledIndex;
        private String status;
        private Long screenId;
    }
}