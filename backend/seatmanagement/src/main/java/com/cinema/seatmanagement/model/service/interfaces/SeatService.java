package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.view.dto.response.SeatMapResponse;

public interface SeatService {

    SeatMapResponse getSeatMap(Long showtimeId);

    void updateSeatState(Long seatId, Long showtimeId, SeatState newState);

    void broadcastSeatUpdate(Long showtimeId, Long seatId, SeatState newState);
}