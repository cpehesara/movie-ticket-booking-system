package com.cinema.seatmanagement.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket session lifecycle listener.
 *
 * Listens to Spring's internal WebSocket application events:
 *   SessionConnectedEvent    — client established WebSocket connection
 *   SessionSubscribeEvent    — client subscribed to a topic (e.g. /topic/seats/42)
 *   SessionUnsubscribeEvent  — client unsubscribed
 *   SessionDisconnectEvent   — client disconnected (tab closed, network drop)
 *
 * Feeds subscriber counts into SeatWebSocketHandler so the admin dashboard
 * can show "N viewers watching this showtime" in real-time.
 *
 * Also handles cleanup: if a browser tab closes without sending an explicit
 * UNSUBSCRIBE frame (the common case), SessionDisconnectEvent fires and we
 * decrement the right counter using the sessionId→showtimeId map.
 *
 * Observer pattern note:
 *   This class subscribes to Spring's internal events (inbound lifecycle).
 *   SeatWebSocketHandler publishes outbound events to React clients.
 *   Together they form the two complementary halves of the Observer pattern
 *   in the WebSocket layer.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final SeatWebSocketHandler seatWebSocketHandler;

    /** Maps sessionId → showtimeId to enable cleanup on unexpected disconnect. */
    private final ConcurrentHashMap<String, Long> sessionShowtimeMap = new ConcurrentHashMap<>();

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        log.info("[WS] Client connected — sessionId={}", sessionId);
    }

    @EventListener
    public void onSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = accessor.getDestination();
        String sessionId   = accessor.getSessionId();

        if (destination == null || !destination.startsWith("/topic/seats/")) return;

        try {
            String[] parts = destination.split("/");
            Long showtimeId = Long.parseLong(parts[parts.length - 1]);

            sessionShowtimeMap.put(sessionId, showtimeId);
            seatWebSocketHandler.registerSubscriber(showtimeId);

            log.info("[WS] Session {} subscribed to showtimeId={} | viewers={}",
                    sessionId, showtimeId,
                    seatWebSocketHandler.getSubscriberCount(showtimeId));
        } catch (NumberFormatException ignored) {
            // e.g. /topic/admin/alerts — not a showtime subscription
        }
    }

    @EventListener
    public void onUnsubscribe(SessionUnsubscribeEvent event) {
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        Long showtimeId  = sessionShowtimeMap.remove(sessionId);
        if (showtimeId != null) {
            seatWebSocketHandler.unregisterSubscriber(showtimeId);
            log.info("[WS] Session {} unsubscribed from showtimeId={}", sessionId, showtimeId);
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        Long showtimeId  = sessionShowtimeMap.remove(sessionId);
        if (showtimeId != null) {
            seatWebSocketHandler.unregisterSubscriber(showtimeId);
            log.info("[WS] Client disconnected — sessionId={} showtimeId={}", sessionId, showtimeId);
        } else {
            log.debug("[WS] Client disconnected — sessionId={} (no showtime subscription)", sessionId);
        }
    }
}