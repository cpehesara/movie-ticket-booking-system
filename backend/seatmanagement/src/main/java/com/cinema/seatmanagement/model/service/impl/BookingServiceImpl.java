package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.SeatAlreadyBookedException;
import com.cinema.seatmanagement.model.entity.*;
import com.cinema.seatmanagement.model.enums.*;
import com.cinema.seatmanagement.model.repository.*;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import com.cinema.seatmanagement.model.service.interfaces.BookingService;
import com.cinema.seatmanagement.model.service.interfaces.QrCodeService;
import com.cinema.seatmanagement.notification.BookingConfirmationEmailService;
import com.cinema.seatmanagement.notification.NotificationContext;
import com.cinema.seatmanagement.notification.ReservationExpiryEmailService;
import com.cinema.seatmanagement.view.dto.request.CreateBookingRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import com.cinema.seatmanagement.websocket.SeatWebSocketHandler;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * BookingServiceImpl — fixed to match BookingService interface.
 *
 * KEY FIXES:
 *  1. createBooking now accepts (Long userId, CreateBookingRequest) to match interface.
 *  2. All methods return BookingResponse (not raw Booking) to match interface.
 *  3. Added BookingMapper dependency to convert Booking → BookingResponse.
 *  4. Added missing getBookingByCode(), getAllBookings(), releaseExpiredReservations().
 *  5. cancelBooking returns BookingResponse (was void).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingServiceImpl implements BookingService {

    private final BookingRepository               bookingRepository;
    private final BookingSeatRepository           bookingSeatRepository;
    private final SeatRepository                  seatRepository;
    private final ShowtimeRepository              showtimeRepository;
    private final UserRepository                  userRepository;
    private final AuditLogService                 auditLogService;
    private final SeatWebSocketHandler            seatWebSocketHandler;
    private final QrCodeService                   qrCodeService;
    private final BookingConfirmationEmailService confirmationEmailService;
    private final ReservationExpiryEmailService   expiryEmailService;
    private final BookingMapper                   bookingMapper;

    private static final long RESERVATION_TTL_MINUTES = 7;

    // ── Create Booking ────────────────────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse createBooking(Long userId, CreateBookingRequest request) {
        Long showtimeId = request.getShowtimeId();
        List<Long> seatIds = request.getSeatIds();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new EntityNotFoundException("Showtime not found: " + showtimeId));

        if (showtime.getStatus() == ShowtimeStatus.CANCELLED
                || showtime.getStatus() == ShowtimeStatus.COMPLETED) {
            throw new IllegalStateException("Cannot book — showtime is " + showtime.getStatus());
        }

        bookingRepository.findActiveByUserAndShowtime(userId, showtimeId).ifPresent(b -> {
            throw new IllegalStateException("User already has an active booking for this showtime");
        });

        List<Seat> seats = seatIds.stream()
                .map(id -> seatRepository.findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Seat not found: " + id)))
                .collect(Collectors.toList());

        for (Seat seat : seats) {
            if (!seat.getIsActive()) {
                throw new IllegalStateException("Seat " + seat.getLabel() + " is not active");
            }
            bookingSeatRepository.findBySeatIdAndShowtimeId(seat.getId(), showtimeId)
                    .ifPresent(bs -> {
                        if (bs.getSeatState() != SeatState.AVAILABLE
                                && bs.getSeatState() != SeatState.CANCELLED) {
                            throw new SeatAlreadyBookedException(
                                    "Seat " + seat.getLabel() + " is already " + bs.getSeatState());
                        }
                    });
        }

        String bookingCode = generateBookingCode();
        BigDecimal totalAmount = showtime.getBasePrice()
                .multiply(BigDecimal.valueOf(seats.size()));

        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .bookingCode(bookingCode)
                .totalAmount(totalAmount)
                .status(BookingStatus.PENDING)
                .build();

        List<BookingSeat> bookingSeats = seats.stream()
                .map(seat -> BookingSeat.builder()
                        .booking(booking)
                        .seat(seat)
                        .showtime(showtime)
                        .seatState(SeatState.RESERVED)
                        .build())
                .collect(Collectors.toList());
        booking.setBookingSeats(bookingSeats);

        Booking saved = bookingRepository.save(booking);

        seats.forEach(seat ->
                seatWebSocketHandler.broadcastSeatStateChange(
                        showtimeId, seat.getId(),
                        seat.getRowLabel(), seat.getColNumber(), SeatState.RESERVED));

        auditLogService.record(null, showtimeId, saved.getId(),
                userId, "USER",
                AuditAction.SEAT_RESERVED, SeatState.AVAILABLE, SeatState.RESERVED,
                "Booking created: " + bookingCode + " for seats " +
                        seats.stream().map(Seat::getLabel).collect(Collectors.joining(", ")));

        log.info("[Booking] Created {} for user={} showtime={} seats={}",
                bookingCode, userId, showtimeId,
                seats.stream().map(Seat::getLabel).collect(Collectors.joining(", ")));

        return bookingMapper.toResponse(saved);
    }

    // ── Get Bookings ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + id));
        String qr = qrCodeService.generateBookingQrCode(
                booking.getBookingCode(), booking.getShowtime().getId(), booking.getUser().getId());
        return bookingMapper.toResponseWithQr(booking, qr);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingByCode(String bookingCode) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingCode));
        String qr = qrCodeService.generateBookingQrCode(
                booking.getBookingCode(), booking.getShowtime().getId(), booking.getUser().getId());
        return bookingMapper.toResponseWithQr(booking, qr);
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

    // ── Cancel Booking ────────────────────────────────────────────────────────

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long requestingUserId) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));

        boolean isAdmin = userRepository.findById(requestingUserId)
                .map(u -> u.getRole() == UserRole.ADMIN || u.getRole() == UserRole.MANAGER)
                .orElse(false);

        if (!isAdmin && !booking.getUser().getId().equals(requestingUserId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Cannot cancel another user's booking");
        }

        if (booking.getCheckedInAt() != null) {
            throw new IllegalStateException("Cannot cancel — customer already checked in");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setQrCodeData(null);
        booking.setQrCodeImage(null);

        List<BookingSeat> seats = bookingSeatRepository.findByBookingId(bookingId);
        seats.forEach(bs -> {
            bs.setSeatState(SeatState.CANCELLED);
            bookingSeatRepository.save(bs);

            seatWebSocketHandler.broadcastSeatStateChange(
                    booking.getShowtime().getId(),
                    bs.getSeat().getId(),
                    bs.getSeat().getRowLabel(),
                    bs.getSeat().getColNumber(),
                    SeatState.CANCELLED);
        });

        Booking saved = bookingRepository.save(booking);

        auditLogService.record(null, booking.getShowtime().getId(), bookingId,
                requestingUserId, isAdmin ? "ADMIN" : "USER",
                AuditAction.SEAT_CANCELLED, SeatState.BOOKED, SeatState.CANCELLED,
                "Booking cancelled: " + booking.getBookingCode());

        log.info("[Booking] Cancelled {} by userId={}", booking.getBookingCode(), requestingUserId);

        return bookingMapper.toResponse(saved);
    }

    // ── Expiry Scheduler ─────────────────────────────────────────────────────

    @Override
    @Scheduled(fixedRateString = "${booking.expiry-check-interval-ms:60000}")
    @Transactional
    public void releaseExpiredReservations() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(RESERVATION_TTL_MINUTES);
        List<Booking> stale  = bookingRepository.findPendingBookingsOlderThan(cutoff);

        for (Booking booking : stale) {
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);

            List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
            bookingSeats.forEach(bs -> {
                bs.setSeatState(SeatState.AVAILABLE);
                bookingSeatRepository.save(bs);

                seatWebSocketHandler.broadcastSeatStateChange(
                        booking.getShowtime().getId(),
                        bs.getSeat().getId(),
                        bs.getSeat().getRowLabel(),
                        bs.getSeat().getColNumber(),
                        SeatState.AVAILABLE);
            });

            NotificationContext ctx = NotificationContext.fromBooking(booking);
            expiryEmailService.sendNotification(ctx);

            log.info("[Booking] Expired stale reservation: {}", booking.getBookingCode());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateBookingCode() {
        String date   = java.time.LocalDate.now().toString().replace("-", "");
        String random = UUID.randomUUID().toString().toUpperCase()
                .replaceAll("[^A-Z0-9]", "")
                .substring(0, 6);
        return "BK-" + date + "-" + random;
    }
}