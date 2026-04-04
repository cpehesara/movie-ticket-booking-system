package com.cinema.seatmanagement.websocket;

import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.util.AppConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * OBSERVER PATTERN (GoF — Behavioural)
 *
 * Subject:   SeatWebSocketHandler (this class)
 * Observers: All React clients subscribed via STOMP to /topic/seats/{showtimeId}
 *
 * When any seat state changes — booking, payment, check-in, admin override, or
 * the expiry scheduler — the responsible service calls broadcastSeatStateChange().
 * This class pushes a JSON payload to every subscribed React tab. They update
 * their Redux seat map in real-time without polling.
 *
 * The STOMP SimpleBroker acts as the subscription registry — exactly what a
 * classic Observer Subject maintains as its listener list.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SeatWebSocketHandler {

    private final SimpMessagingTemplate messagingTemplate;

    /** showtimeId → count of React clients currently subscribed */
    private final ConcurrentHashMap<Long, AtomicInteger> subscriberCounts
            = new ConcurrentHashMap<>();

    // ── Primary broadcast ─────────────────────────────────────────────────

    /**
     * Notify all subscribed React clients of a seat state change.
     * Topic path uses AppConstants.SEAT_TOPIC_PREFIX — consistent with
     * WebSocketEventListener's subscription parsing logic.
     *
     * The payload mirrors SeatMapResponse.SeatInfo so the Redux reducer
     * can do a targeted seat update without re-fetching the full seat map.
     */
    public void broadcastSeatStateChange(Long showtimeId, Long seatId,
                                         String rowLabel, Integer colNumber,
                                         SeatState newState) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("seatId",     seatId);
        payload.put("showtimeId", showtimeId);
        payload.put("rowLabel",   rowLabel);
        payload.put("colNumber",  colNumber);
        payload.put("seatState",  newState.name());
        payload.put("timestamp",  System.currentTimeMillis());

        messagingTemplate.convertAndSend(
                AppConstants.SEAT_TOPIC_PREFIX + showtimeId, (Object) payload);

        log.debug("[WS] Seat update → {} | seat={}{} state={}",
                AppConstants.SEAT_TOPIC_PREFIX + showtimeId, rowLabel, colNumber, newState);
    }

    /**
     * Broadcast a showtime-level event (CANCELLED, COMPLETED, etc.).
     * React clients use eventType to show a banner or trigger a full refresh.
     */
    public void broadcastShowtimeEvent(Long showtimeId, String eventType,
                                       Map<String, Object> extras) {
        Map<String, Object> payload = new HashMap<>(extras);
        payload.put("eventType",  eventType);
        payload.put("showtimeId", showtimeId);
        payload.put("timestamp",  System.currentTimeMillis());

        messagingTemplate.convertAndSend(
                AppConstants.SEAT_TOPIC_PREFIX + showtimeId, (Object) payload);

        log.info("[WS] Showtime event → showtimeId={} type={}", showtimeId, eventType);
    }

    /**
     * Broadcast an admin-only alert (kiosk offline, concurrent conflict, etc.)
     * to the admin dashboard topic.
     */
    public void broadcastAdminAlert(String alertType, Map<String, Object> data) {
        Map<String, Object> payload = new HashMap<>(data);
        payload.put("alertType", alertType);
        payload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend(AppConstants.ADMIN_ALERT_TOPIC, (Object) payload);
        log.warn("[WS] Admin alert: type={}", alertType);
    }

    public void broadcastIoTEvent(Long showtimeId, String type, Map<String, Object> data) {
        Map<String, Object> payload = new HashMap<>(data);
        payload.put("type", type);
        payload.put("showtimeId", showtimeId);
        payload.put("timestamp", System.currentTimeMillis());
        payload.put("id", UUID.randomUUID().toString());

        messagingTemplate.convertAndSend(AppConstants.IOT_TOPIC_PREFIX + showtimeId, (Object) payload);
        log.debug("[WS] IoT Event → type={} showtime={}", type, showtimeId);
    }

    // ── Subscriber tracking ───────────────────────────────────────────────

    public void registerSubscriber(Long showtimeId) {
        subscriberCounts.computeIfAbsent(showtimeId, k -> new AtomicInteger(0))
                .incrementAndGet();
    }

    public void unregisterSubscriber(Long showtimeId) {
        AtomicInteger count = subscriberCounts.get(showtimeId);
        if (count != null && count.decrementAndGet() <= 0) {
            subscriberCounts.remove(showtimeId);
        }
    }

    public int getSubscriberCount(Long showtimeId) {
        AtomicInteger c = subscriberCounts.get(showtimeId);
        return c != null ? c.get() : 0;
    }

    /** Returns live viewer counts for all active showtimes — used by admin dashboard */
    public Map<Long, Integer> getAllSubscriberCounts() {
        Map<Long, Integer> result = new HashMap<>();
        subscriberCounts.forEach((k, v) -> result.put(k, v.get()));
        return result;
    }
}