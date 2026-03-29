package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.view.dto.response.SeatMapResponse;

public interface SeatService {

    SeatMapResponse getSeatMap(Long showtimeId);

    /**
     * Admin-triggered state override.
     * Delegates transition validation to SeatStateContext (State pattern).
     * Fires WebSocket broadcast + MQTT LED command after persisting.
     *
     * @param actorId   ID of the admin/operator performing the override
     */
    void updateSeatState(Long seatId, Long showtimeId, SeatState newState, Long actorId);

    /**
     * Broadcasts a seat state change to all subscribed React clients via STOMP
     * and to the ESP32 LED strip via MQTT.
     * Called by every service that mutates seat state.
     */
    void broadcastSeatUpdate(Long showtimeId, Long seatId, SeatState newState);

    /**
     * Replays current seat states for a showtime to an ESP32 that reconnected.
     * Publishes one MQTT SET_LED command per seat with a mapped ledIndex.
     */
    void resyncLedsForShowtime(Long showtimeId);
}