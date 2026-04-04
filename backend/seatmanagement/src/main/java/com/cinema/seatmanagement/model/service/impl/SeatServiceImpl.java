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
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SeatServiceImpl — seat map queries, state overrides, WebSocket + MQTT broadcast.
 *
 * KEY CHANGE: The state machine now includes the GUIDING state between BOOKED and OCCUPIED:
 *
 *   AVAILABLE → RESERVED → BOOKED → GUIDING → OCCUPIED → AVAILABLE
 *
 * GUIDING is the "in-transit" state while the customer walks from the entrance
 * door to their seat. The LED blinks fast during this window to guide them.
 *
 * broadcastSeatUpdate() is the single point where:
 *   1. A WebSocket message is sent to all React clients (seat map updates live)
 *   2. An MQTT command is sent to the ESP32 (LED changes pattern)
 *
 * Any service that transitions a seat state MUST call broadcastSeatUpdate()
 * after persisting the change. This enforces the Observer pattern across the
 * WebSocket and MQTT channels simultaneously.
 *
 * GoF Observer: SimpMessagingTemplate is the subject; React seat maps and the
 * staff tracking display are the observers.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SeatServiceImpl implements SeatService {

    private final SeatRepository seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatMapper seatMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MqttPublisher mqttPublisher;

    // ── Queries ──────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public SeatMapResponse getSeatMap(Long showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Showtime not found with id: " + showtimeId));

        Screen screen = showtime.getScreen();
        List<Seat> seats = seatRepository
                .findByScreenIdOrderByRowLabelAscColNumberAsc(screen.getId());
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByShowtimeId(showtimeId);

        return seatMapper.toSeatMapResponse(showtimeId, screen, seats, bookingSeats);
    }

    // ── Admin state override ─────────────────────────────────────────────────

    @Override
    @Transactional
    public void updateSeatState(Long seatId, Long showtimeId, SeatState newState, Long actorId) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Seat not found with id: " + seatId));

        BookingSeat bookingSeat = bookingSeatRepository
                .findBySeatAndShowtimeForUpdate(seatId, showtimeId)
                .orElse(null);

        // MAINTENANCE can be forced from any state by admin
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
                    "No booking found for seat "
                            + seat.getRowLabel() + "-" + seat.getColNumber()
                            + " in this showtime");
        }

        validateStateTransition(bookingSeat.getSeatState(), newState);
        bookingSeat.setSeatState(newState);
        bookingSeatRepository.save(bookingSeat);

        broadcastSeatUpdate(showtimeId, seatId, newState);
    }

    // ── Real-time broadcast (Observer pattern — notifies WS + MQTT) ─────────

    /**
     * Central broadcast method. Must be called by EVERY service that mutates seat state.
     *
     * 1. Publishes to WebSocket topic /topic/seats/{showtimeId}
     *    → React seat maps receive the update and re-render without page refresh
     *
     * 2. Publishes MQTT command to ESP32 via MqttPublisher
     *    → Physical LED changes pattern (only if seat has a led_index)
     *
     * The payload also includes rowLabel and colNumber so the frontend can
     * display seat labels in toast notifications without a separate API call.
     */
    @Override
    public void broadcastSeatUpdate(Long showtimeId, Long seatId, SeatState newState) {
        // Build WebSocket payload
        Seat seat = seatRepository.findById(seatId).orElse(null);

        Map<String, Object> update = new HashMap<>();
        update.put("seatId",     seatId);
        update.put("showtimeId", showtimeId);
        update.put("seatState",  newState.name());
        update.put("rowLabel",   seat != null ? seat.getRowLabel()  : "?");
        update.put("colNumber",  seat != null ? seat.getColNumber() : 0);
        update.put("timestamp",  LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/seats/" + showtimeId, (Object) update);

        // Publish MQTT LED command (only for seats wired to an LED)
        if (seat != null && seat.getLedIndex() != null) {
            Long screenId = seat.getScreen().getId();
            mqttPublisher.publishSeatCommand(screenId, seat.getLedIndex(), newState);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void resyncLedsForShowtime(Long showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId).orElse(null);
        if (showtime == null) return;

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByShowtimeId(showtimeId);
        Long screenId = showtime.getScreen().getId();

        for (BookingSeat bs : bookingSeats) {
            Seat seat = bs.getSeat();
            if (seat != null && seat.getLedIndex() != null) {
                mqttPublisher.publishSeatCommand(screenId, seat.getLedIndex(), bs.getSeatState());
            }
        }
    }

    // ── State machine validation (GoF State pattern support) ─────────────────

    /**
     * Validates that a transition from `current` to `target` is legal.
     * Illegal transitions throw InvalidSeatStateTransitionException.
     *
     * Valid transition table:
     *   AVAILABLE   → RESERVED | MAINTENANCE
     *   RESERVED    → BOOKED | CANCELLED | MAINTENANCE
     *   BOOKED      → GUIDING | CANCELLED | MAINTENANCE    ← GUIDING added
     *   GUIDING     → OCCUPIED | MAINTENANCE               ← new state
     *   OCCUPIED    → AVAILABLE | MAINTENANCE
     *   CANCELLED   → AVAILABLE | MAINTENANCE
     *   MAINTENANCE → AVAILABLE
     */
    private void validateStateTransition(SeatState current, SeatState target) {
        boolean valid = switch (current) {
            case AVAILABLE   -> target == SeatState.RESERVED   || target == SeatState.MAINTENANCE;
            case RESERVED    -> target == SeatState.BOOKED     || target == SeatState.CANCELLED
                    || target == SeatState.MAINTENANCE;
            case BOOKED      -> target == SeatState.GUIDING    || target == SeatState.CANCELLED
                    || target == SeatState.MAINTENANCE;
            case GUIDING     -> target == SeatState.OCCUPIED   || target == SeatState.MAINTENANCE;
            case OCCUPIED    -> target == SeatState.AVAILABLE  || target == SeatState.MAINTENANCE;
            case CANCELLED   -> target == SeatState.AVAILABLE  || target == SeatState.MAINTENANCE;
            case MAINTENANCE -> target == SeatState.AVAILABLE;
        };

        if (!valid) {
            throw new InvalidSeatStateTransitionException(
                    "Invalid seat state transition: " + current + " → " + target
                            + ". See SeatState Javadoc for valid transitions.");
        }
    }
}