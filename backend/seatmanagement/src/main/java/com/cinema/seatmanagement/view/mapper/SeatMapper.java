package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Screen;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.view.dto.response.SeatMapResponse;
import org.springframework.stereotype.Component;

import java.util.Comparator;
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
        /**
         * Original bug in merge function: (existing, replacement) -> existing
         *
         * This keeps the FIRST BookingSeat encountered for a seat when there are
         * duplicates (e.g. a cancelled then re-reserved seat for the same showtime —
         * the unique constraint prevents this at the DB level, but defensive coding
         * matters here). More importantly, "first" is stream-order dependent and
         * non-deterministic.
         *
         * Fixed: keep the BookingSeat with the most recent stateUpdatedAt.
         * This guarantees the seat map always reflects the latest known state,
         * which matters for the hall display board that must be authoritative.
         */
        Map<Long, SeatState> seatStateMap = bookingSeats.stream()
                .collect(Collectors.toMap(
                        bs -> bs.getSeat().getId(),
                        bs -> bs,                           // keep full BookingSeat so merge can compare timestamps
                        (existing, replacement) -> {
                            if (existing.getStateUpdatedAt() == null) return replacement;
                            if (replacement.getStateUpdatedAt() == null) return existing;
                            return replacement.getStateUpdatedAt()
                                    .isAfter(existing.getStateUpdatedAt()) ? replacement : existing;
                        }
                ))
                .entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().getSeatState()    // extract SeatState after duplicates resolved
                ));

        List<SeatMapResponse.SeatInfo> seatInfos = seats.stream()
                .map(seat -> toSeatInfo(seat, seatStateMap))
                .collect(Collectors.toList());

        // availableCount: count seats that are AVAILABLE (not in seatStateMap, or explicitly AVAILABLE)
        long availableCount = seatInfos.stream()
                .filter(si -> SeatState.AVAILABLE.name().equals(si.getSeatState()) && Boolean.TRUE.equals(si.getIsActive()))
                .count();

        return SeatMapResponse.builder()
                .showtimeId(showtimeId)
                .screenId(screen.getId())
                .screenName(screen.getName())
                .rowsCount(screen.getRowsCount())
                .colsCount(screen.getColsCount())
                .totalSeats(screen.getTotalSeats())
                .availableCount((int) availableCount)
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
                .ledIndex(seat.getLedIndex())   // null if no LED mapped to this seat
                .build();
    }
}