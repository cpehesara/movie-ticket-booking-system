package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.SeatAlreadyBookedException;
import com.cinema.seatmanagement.model.entity.*;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.*;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import com.cinema.seatmanagement.model.service.interfaces.BookingService;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.notification.BookingCancellationEmailService;
import com.cinema.seatmanagement.notification.NotificationContext;
import com.cinema.seatmanagement.notification.ReservationExpiryEmailService;
import com.cinema.seatmanagement.util.QrCodeGenerator;
import com.cinema.seatmanagement.view.dto.request.CreateBookingRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingServiceImpl implements BookingService {

    private final BookingRepository               bookingRepository;
    private final BookingSeatRepository           bookingSeatRepository;
    private final SeatRepository                  seatRepository;
    private final ShowtimeRepository              showtimeRepository;
    private final UserRepository                  userRepository;
    private final BookingMapper                   bookingMapper;
    private final QrCodeGenerator                 qrCodeGenerator;
    private final SeatService                     seatService;
    private final AuditLogService                 auditLogService;
    private final BookingCancellationEmailService cancellationEmailService;
    private final ReservationExpiryEmailService   expiryEmailService;

    @Value("${booking.reservation-ttl-minutes:7}")
    private int reservationTtlMinutes;

    // ══════════════════════════════════════════════════════════════════════
    //  FACADE PATTERN — createBooking orchestrates 9 sub-steps
    // ══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public BookingResponse createBooking(Long userId, CreateBookingRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Showtime not found with id: " + request.getShowtimeId()));

        List<Seat> seats = resolveAndLockSeats(request);

        BigDecimal totalAmount = showtime.getBasePrice().multiply(BigDecimal.valueOf(seats.size()));

        // BUILDER PATTERN — inner class constructs Booking with business defaults
        Booking booking = new BookingEntityBuilder()
                .forUser(user)
                .forShowtime(showtime)
                .withCode(generateBookingCode())
                .withTotal(totalAmount)
                .build();
        booking = bookingRepository.save(booking);

        for (Seat seat : seats) {
            BookingSeat bookingSeat = BookingSeat.builder()
                    .booking(booking)
                    .seat(seat)
                    .showtime(showtime)
                    .seatState(SeatState.RESERVED)
                    .build();
            bookingSeatRepository.save(bookingSeat);

            seatService.broadcastSeatUpdate(showtime.getId(), seat.getId(), SeatState.RESERVED);

            auditLogService.record(
                    seat.getId(), showtime.getId(), booking.getId(),
                    userId, "USER",
                    AuditAction.SEAT_RESERVED,
                    SeatState.AVAILABLE, SeatState.RESERVED,
                    "Seat reserved during booking creation"
            );
        }

        // Re-fetch with entity graph to avoid N+1 in mapper
        booking = bookingRepository.findWithDetailsById(booking.getId())
                .orElseThrow(() -> new EntityNotFoundException("Booking disappeared after save"));

        auditLogService.record(
                null, showtime.getId(), booking.getId(),
                userId, "USER",
                AuditAction.BOOKING_CREATED, null, null,
                "Booking " + booking.getBookingCode() + " created"
        );

        String qrCode = qrCodeGenerator.generateQrCodeBase64(booking.getBookingCode());
        return bookingMapper.toResponseWithQr(booking, qrCode);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingByCode(String bookingCode) {
        Booking booking = bookingRepository.findWithDetailsByBookingCode(bookingCode)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with code: " + bookingCode));
        return bookingMapper.toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findWithDetailsById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with id: " + id));
        return bookingMapper.toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserIdOrderByBookedAtDesc(userId).stream()
                .map(bookingMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsByShowtime(Long showtimeId) {
        return bookingRepository.findByShowtimeId(showtimeId).stream()
                .map(bookingMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll().stream()
                .map(bookingMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findWithDetailsById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with id: " + bookingId));

        if (!booking.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only cancel your own bookings");
        }

        if (booking.getStatus() == BookingStatus.CHECKED_IN
                || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalStateException(
                    "Cannot cancel a booking that has already been checked in or completed");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        for (BookingSeat bs : booking.getBookingSeats()) {
            SeatState prevState = bs.getSeatState();
            bs.setSeatState(SeatState.CANCELLED);
            bookingSeatRepository.save(bs);

            // Broadcast AVAILABLE so the seat turns green immediately on all maps
            seatService.broadcastSeatUpdate(
                    booking.getShowtime().getId(), bs.getSeat().getId(), SeatState.AVAILABLE);

            auditLogService.record(
                    bs.getSeat().getId(), booking.getShowtime().getId(), bookingId,
                    userId, "USER",
                    AuditAction.SEAT_CANCELLED,
                    prevState, SeatState.CANCELLED,
                    "Booking cancelled by customer"
            );
        }

        auditLogService.record(
                null, booking.getShowtime().getId(), bookingId,
                userId, "USER",
                AuditAction.BOOKING_CANCELLED, null, null, null
        );

        // ── Email notification — TEMPLATE METHOD PATTERN ──────────────────
        // Runs @Async — response returns to customer immediately.
        try {
            NotificationContext ctx = NotificationContext.fromBookingWithReason(
                    booking, "Cancelled by customer");
            cancellationEmailService.sendNotification(ctx);
        } catch (Exception e) {
            log.error("[Email] Failed to send cancellation email for booking={}: {}",
                    booking.getBookingCode(), e.getMessage(), e);
        }

        return bookingMapper.toResponse(booking);
    }

    @Override
    @Transactional
    @Scheduled(fixedRateString = "${booking.expiry-check-interval-ms:60000}")
    public void releaseExpiredReservations() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(reservationTtlMinutes);
        List<Booking> expired = bookingRepository.findExpiredReservations(
                BookingStatus.PENDING, cutoff);

        for (Booking booking : expired) {
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);

            for (BookingSeat bs : booking.getBookingSeats()) {
                if (bs.getSeatState() == SeatState.RESERVED) {
                    bs.setSeatState(SeatState.CANCELLED);
                    bookingSeatRepository.save(bs);

                    seatService.broadcastSeatUpdate(
                            booking.getShowtime().getId(),
                            bs.getSeat().getId(),
                            SeatState.AVAILABLE);

                    auditLogService.record(
                            bs.getSeat().getId(), booking.getShowtime().getId(), booking.getId(),
                            null, "SYSTEM",
                            AuditAction.SEAT_RELEASED_BY_EXPIRY,
                            SeatState.RESERVED, SeatState.CANCELLED,
                            "Reservation TTL expired after " + reservationTtlMinutes + " minutes"
                    );
                }
            }

            auditLogService.record(
                    null, booking.getShowtime().getId(), booking.getId(),
                    null, "SYSTEM",
                    AuditAction.BOOKING_EXPIRED, null, null, null
            );

            // ── Email notification — TEMPLATE METHOD PATTERN ──────────────
            // Runs @Async on emailTaskExecutor — scheduler thread never blocked.
            // "Book again" URL points to the movie list page so the customer
            // can immediately re-book if seats are still available.
            try {
                NotificationContext ctx = NotificationContext.fromBooking(booking)
                        .toBuilder()
                        .bookingUrl("http://localhost:3000/movies")
                        .build();
                expiryEmailService.sendNotification(ctx);
            } catch (Exception e) {
                log.error("[Email] Failed to send expiry email for booking={}: {}",
                        booking.getBookingCode(), e.getMessage(), e);
            }
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private List<Seat> resolveAndLockSeats(CreateBookingRequest request) {
        List<Seat> seats = new ArrayList<>();
        for (Long seatId : request.getSeatIds()) {
            Seat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Seat not found with id: " + seatId));

            if (!seat.getIsActive()) {
                throw new SeatAlreadyBookedException(
                        "Seat " + seat.getRowLabel() + "-" + seat.getColNumber()
                                + " is not available");
            }

            if (bookingSeatRepository.existsBySeatIdAndShowtimeId(seatId, request.getShowtimeId())) {
                bookingSeatRepository.findBySeatAndShowtimeForUpdate(seatId, request.getShowtimeId())
                        .ifPresent(existing -> {
                            if (existing.getSeatState() != SeatState.CANCELLED) {
                                throw new SeatAlreadyBookedException(
                                        "Seat " + seat.getRowLabel() + "-" + seat.getColNumber()
                                                + " is already " + existing.getSeatState());
                            }
                        });
            }
            seats.add(seat);
        }
        return seats;
    }

    private String generateBookingCode() {
        return "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    // ══════════════════════════════════════════════════════════════════════
    //  BUILDER PATTERN — inner class
    //
    //  Encapsulates business defaults (status=PENDING, version=0) so service
    //  code never sets them directly — prevents accidentally creating a booking
    //  in an invalid initial state.
    // ══════════════════════════════════════════════════════════════════════
    private static final class BookingEntityBuilder {

        private User       user;
        private Showtime   showtime;
        private String     bookingCode;
        private BigDecimal totalAmount;

        BookingEntityBuilder forUser(User user) {
            this.user = user;
            return this;
        }

        BookingEntityBuilder forShowtime(Showtime showtime) {
            this.showtime = showtime;
            return this;
        }

        BookingEntityBuilder withCode(String bookingCode) {
            this.bookingCode = bookingCode;
            return this;
        }

        BookingEntityBuilder withTotal(BigDecimal totalAmount) {
            this.totalAmount = totalAmount;
            return this;
        }

        Booking build() {
            return Booking.builder()
                    .user(user)
                    .showtime(showtime)
                    .bookingCode(bookingCode)
                    .totalAmount(totalAmount)
                    .status(BookingStatus.PENDING)
                    .version(0)
                    .build();
        }
    }
}