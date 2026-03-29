package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.InvalidSeatStateTransitionException;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Screen;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.SeatRepository;
import com.cinema.seatmanagement.model.repository.ShowtimeRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeatServiceImpl implements SeatService {

    private final SeatRepository        seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeRepository    showtimeRepository;
    private final SeatMapper            seatMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MqttPublisher         mqttPublisher;
    private final AuditLogService       auditLogService;

    // ══════════════════════════════════════════════════════════════════════
    //  NOTE ON STATE PATTERN:
    //  The old validateStateTransition() private method (a switch/case guard)
    //  is COMPLETELY REMOVED. All transition validation is now delegated to
    //  SeatStateContext.of(current).putInMaintenance() / .release() / etc.
    //
    //  This is the correct State pattern implementation:
    //   - SeatServiceImpl knows NOTHING about which transitions are legal
    //   - Each concrete state class (AvailableState, BookedState, ...) owns
    //     its own guard and throws InvalidSeatStateTransitionException itself
    //   - Adding a new state = add one class; zero changes here (Open/Closed)
    // ══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public SeatMapResponse getSeatMap(Long showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Showtime not found with id: " + showtimeId));

        Screen screen = showtime.getScreen();

        // Active seats only, sorted for grid rendering
        List<Seat> seats = seatRepository
                .findByScreenIdAndIsActiveTrueOrderByRowLabelAscColNumberAsc(screen.getId());

        // Composite-index query (showtime_id, seat_state) — fast on large halls
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByShowtimeId(showtimeId);

        return seatMapper.toSeatMapResponse(showtimeId, screen, seats, bookingSeats);
    }

    @Override
    @Transactional
    public void updateSeatState(Long seatId, Long showtimeId, SeatState newState, Long actorId) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new EntityNotFoundException("Seat not found with id: " + seatId));

        BookingSeat bookingSeat = bookingSeatRepository
                .findBySeatAndShowtimeForUpdate(seatId, showtimeId)
                .orElse(null);

        SeatState prevState;

        if (newState == SeatState.MAINTENANCE) {
            prevState = bookingSeat != null ? bookingSeat.getSeatState() : SeatState.AVAILABLE;

            // STATE PATTERN — putInMaintenance() is legal from every non-MAINTENANCE state
            SeatStateContext ctx = SeatStateContext.of(prevState);
            ctx.putInMaintenance();   // throws if already in MAINTENANCE

            if (bookingSeat != null) {
                bookingSeat.setSeatState(SeatState.MAINTENANCE);
                bookingSeatRepository.save(bookingSeat);
            }
            // If no BookingSeat row exists (seat was AVAILABLE and never booked),
            // we still broadcast and log — the LED needs to go white.
            broadcastSeatUpdate(showtimeId, seatId, SeatState.MAINTENANCE);

            auditLogService.record(
                    seatId, showtimeId, null,
                    actorId, "USER",
                    AuditAction.SEAT_MAINTENANCE_SET,
                    prevState, SeatState.MAINTENANCE,
                    "Admin override for seat "
                            + seat.getRowLabel() + "-" + seat.getColNumber()
            );
            return;
        }

        if (bookingSeat == null) {
            throw new InvalidSeatStateTransitionException(
                    "No booking record found for seat "
                            + seat.getRowLabel() + "-" + seat.getColNumber()
                            + " in showtime " + showtimeId);
        }

        prevState = bookingSeat.getSeatState();

        // STATE PATTERN — dispatch to the appropriate transition method
        SeatStateContext ctx       = SeatStateContext.of(prevState);
        SeatState        nextState = dispatchTransition(ctx, newState);

        bookingSeat.setSeatState(nextState);
        bookingSeatRepository.save(bookingSeat);

        broadcastSeatUpdate(showtimeId, seatId, nextState);

        auditLogService.record(
                seatId, showtimeId, bookingSeat.getBooking().getId(),
                actorId, "USER",
                AuditAction.ADMIN_STATE_OVERRIDE,
                prevState, nextState,
                "Admin forced state to " + nextState
        );
    }

    @Override
    public void broadcastSeatUpdate(Long showtimeId, Long seatId, SeatState newState) {
        // WebSocket — push to all React clients subscribed to /topic/seats/{showtimeId}
        Map<String, Object> update = new HashMap<>();
        update.put("seatId",     seatId);
        update.put("showtimeId", showtimeId);
        update.put("seatState",  newState.name());
        messagingTemplate.convertAndSend("/topic/seats/" + showtimeId, (Object) update);

        // MQTT — fire SET_LED command to ESP32 if this seat has a mapped LED
        seatRepository.findById(seatId).ifPresent(seat -> {
            if (seat.getLedIndex() != null) {
                mqttPublisher.publishSeatCommand(
                        seat.getScreen().getId(), seat.getLedIndex(), newState);
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public void resyncLedsForShowtime(Long showtimeId) {
        // Called when an ESP32 reconnects after a WiFi drop.
        // Fetches every BookingSeat for this showtime and replays the current
        // state as a SET_LED MQTT command — no DB writes, read-only.
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByShowtimeId(showtimeId);

        for (BookingSeat bs : bookingSeats) {
            Seat seat = bs.getSeat();
            if (seat.getLedIndex() != null) {
                mqttPublisher.publishSeatCommand(
                        seat.getScreen().getId(), seat.getLedIndex(), bs.getSeatState());
            }
        }

        // Seats with no BookingSeat row are AVAILABLE — publish GREEN for all of them
        if (!bookingSeats.isEmpty()) {
            Long screenId = bookingSeats.get(0).getSeat().getScreen().getId();
            List<Seat> mappedSeats = seatRepository.findMappedLedSeatsByScreenId(screenId);

            // Determine which seatIds already have a booking record
            java.util.Set<Long> bookedSeatIds = bookingSeats.stream()
                    .map(bs -> bs.getSeat().getId())
                    .collect(java.util.stream.Collectors.toSet());

            for (Seat seat : mappedSeats) {
                if (!bookedSeatIds.contains(seat.getId())) {
                    mqttPublisher.publishSeatCommand(
                            screenId, seat.getLedIndex(), SeatState.AVAILABLE);
                }
            }
        }

        log.info("LED re-sync complete for showtime {}: {} booking-seat records replayed",
                showtimeId, bookingSeats.size());
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Maps a target SeatState to the correct SeatStateContext method.
     * This is the ONLY place in the codebase that knows the mapping from
     * "desired state" → "transition method" — and it's 7 lines.
     * The actual legality check lives in the concrete state classes.
     */
    private SeatState dispatchTransition(SeatStateContext ctx, SeatState target) {
        return switch (target) {
            case RESERVED    -> ctx.reserve();
            case BOOKED      -> ctx.book();
            case OCCUPIED    -> ctx.occupy();
            case CANCELLED   -> ctx.cancel();
            case AVAILABLE   -> ctx.release();
            case MAINTENANCE -> ctx.putInMaintenance();
        };
    }
}