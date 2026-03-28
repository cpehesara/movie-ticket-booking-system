package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Screen;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.view.dto.response.SeatMapResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class SeatMapper {

    public SeatMapResponse toSeatMapResponse(
            Long showtimeId,
            Screen screen,
            List<Seat> seats,
            List<BookingSeat> bookingSeats
    ) {
        Map<Long, SeatState> seatStateMap = bookingSeats.stream()
                .collect(Collectors.toMap(
                        bs -> bs.getSeat().getId(),
                        BookingSeat::getSeatState,
                        (existing, replacement) -> existing
                ));

        List<SeatMapResponse.SeatInfo> seatInfos = seats.stream()
                .map(seat -> toSeatInfo(seat, seatStateMap))
                .collect(Collectors.toList());

        return SeatMapResponse.builder()
                .showtimeId(showtimeId)
                .screenId(screen.getId())
                .screenName(screen.getName())
                .rowsCount(screen.getRowsCount())
                .colsCount(screen.getColsCount())
                .seats(seatInfos)
                .build();
    }

    private SeatMapResponse.SeatInfo toSeatInfo(Seat seat, Map<Long, SeatState> seatStateMap) {
        SeatState state = seatStateMap.getOrDefault(seat.getId(), SeatState.AVAILABLE);

        return SeatMapResponse.SeatInfo.builder()
                .seatId(seat.getId())
                .rowLabel(seat.getRowLabel())
                .colNumber(seat.getColNumber())
                .seatType(seat.getSeatType().name())
                .seatState(state.name())
                .isActive(seat.getIsActive())
                .build();
    }
}