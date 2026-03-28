package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.InvalidSeatStateTransitionException;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Screen;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.SeatRepository;
import com.cinema.seatmanagement.model.repository.ShowtimeRepository;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.view.dto.response.SeatMapResponse;
import com.cinema.seatmanagement.view.mapper.SeatMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SeatServiceImpl implements SeatService {

    private final SeatRepository seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatMapper seatMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MqttPublisher mqttPublisher;

    @Override
    @Transactional(readOnly = true)
    public SeatMapResponse getSeatMap(Long showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new EntityNotFoundException("Showtime not found with id: " + showtimeId));

        Screen screen = showtime.getScreen();
        List<Seat> seats = seatRepository.findByScreenIdOrderByRowLabelAscColNumberAsc(screen.getId());
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByShowtimeId(showtimeId);

        return seatMapper.toSeatMapResponse(showtimeId, screen, seats, bookingSeats);
    }

    @Override
    @Transactional
    public void updateSeatState(Long seatId, Long showtimeId, SeatState newState) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new EntityNotFoundException("Seat not found with id: " + seatId));

        BookingSeat bookingSeat = bookingSeatRepository.findBySeatAndShowtimeForUpdate(seatId, showtimeId)
                .orElse(null);

        if (newState == SeatState.MAINTENANCE) {
            if (bookingSeat != null) {
                bookingSeat.setSeatState(SeatState.MAINTENANCE);
                bookingSeatRepository.save(bookingSeat);
            }
            broadcastSeatUpdate(showtimeId, seatId, SeatState.MAINTENANCE);
            return;
        }

        if (bookingSeat == null) {
            throw new InvalidSeatStateTransitionException(
                    "No booking found for seat " + seat.getRowLabel() + "-" + seat.getColNumber() + " in this showtime");
        }

        validateStateTransition(bookingSeat.getSeatState(), newState);
        bookingSeat.setSeatState(newState);
        bookingSeatRepository.save(bookingSeat);

        broadcastSeatUpdate(showtimeId, seatId, newState);
    }

    @Override
    public void broadcastSeatUpdate(Long showtimeId, Long seatId, SeatState newState) {
        Map<String, Object> update = new HashMap<>();
        update.put("seatId", seatId);
        update.put("showtimeId", showtimeId);
        update.put("seatState", newState.name());

        messagingTemplate.convertAndSend("/topic/seats/" + showtimeId, (Object) update);

        Seat seat = seatRepository.findById(seatId).orElse(null);
        if (seat != null && seat.getLedIndex() != null) {
            Long screenId = seat.getScreen().getId();
            mqttPublisher.publishSeatCommand(screenId, seat.getLedIndex(), newState);
        }
    }

    private void validateStateTransition(SeatState current, SeatState target) {
        boolean valid = switch (current) {
            case AVAILABLE -> target == SeatState.RESERVED || target == SeatState.MAINTENANCE;
            case RESERVED -> target == SeatState.BOOKED || target == SeatState.CANCELLED || target == SeatState.MAINTENANCE;
            case BOOKED -> target == SeatState.OCCUPIED || target == SeatState.CANCELLED || target == SeatState.MAINTENANCE;
            case OCCUPIED -> target == SeatState.AVAILABLE || target == SeatState.MAINTENANCE;
            case CANCELLED -> target == SeatState.AVAILABLE || target == SeatState.MAINTENANCE;
            case MAINTENANCE -> target == SeatState.AVAILABLE;
        };

        if (!valid) {
            throw new InvalidSeatStateTransitionException(
                    "Cannot transition seat from " + current + " to " + target);
        }
    }
}