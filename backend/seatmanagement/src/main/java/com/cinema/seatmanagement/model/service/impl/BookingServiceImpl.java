package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.BookingExpiredException;
import com.cinema.seatmanagement.exception.SeatAlreadyBookedException;
import com.cinema.seatmanagement.model.entity.*;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.*;
import com.cinema.seatmanagement.model.service.interfaces.BookingService;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.util.QrCodeGenerator;
import com.cinema.seatmanagement.view.dto.request.CreateBookingRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
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
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final BookingMapper bookingMapper;
    private final QrCodeGenerator qrCodeGenerator;
    private final SeatService seatService;

    @Value("${booking.reservation-ttl-minutes:7}")
    private int reservationTtlMinutes;

    @Override
    @Transactional
    public BookingResponse createBooking(Long userId, CreateBookingRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new EntityNotFoundException("Showtime not found with id: " + request.getShowtimeId()));

        List<Seat> seats = new ArrayList<>();
        for (Long seatId : request.getSeatIds()) {
            Seat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new EntityNotFoundException("Seat not found with id: " + seatId));

            if (bookingSeatRepository.existsBySeatIdAndShowtimeId(seatId, request.getShowtimeId())) {
                bookingSeatRepository.findBySeatAndShowtimeForUpdate(seatId, request.getShowtimeId())
                        .ifPresent(existing -> {
                            if (existing.getSeatState() != SeatState.CANCELLED) {
                                throw new SeatAlreadyBookedException(
                                        "Seat " + seat.getRowLabel() + "-" + seat.getColNumber() +
                                                " is already " + existing.getSeatState() + " for this showtime");
                            }
                        });
            }
            seats.add(seat);
        }

        String bookingCode = generateBookingCode();
        BigDecimal totalAmount = showtime.getBasePrice().multiply(BigDecimal.valueOf(seats.size()));

        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .bookingCode(bookingCode)
                .totalAmount(totalAmount)
                .status(BookingStatus.PENDING)
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
        }

        booking = bookingRepository.findById(booking.getId())
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));

        String qrCode = qrCodeGenerator.generateQrCodeBase64(bookingCode);
        return bookingMapper.toResponseWithQr(booking, qrCode);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingByCode(String bookingCode) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with code: " + bookingCode));
        return bookingMapper.toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with id: " + id));
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
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with id: " + bookingId));

        if (!booking.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only cancel your own bookings");
        }

        if (booking.getStatus() == BookingStatus.CHECKED_IN || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a booking that has already been checked in or completed");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        for (BookingSeat bs : booking.getBookingSeats()) {
            bs.setSeatState(SeatState.CANCELLED);
            bookingSeatRepository.save(bs);

            seatService.broadcastSeatUpdate(booking.getShowtime().getId(), bs.getSeat().getId(), SeatState.AVAILABLE);
        }

        return bookingMapper.toResponse(booking);
    }

    @Override
    @Transactional
    @Scheduled(fixedRateString = "${booking.expiry-check-interval-ms:60000}")
    public void releaseExpiredReservations() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(reservationTtlMinutes);
        List<Booking> expired = bookingRepository.findExpiredReservations(BookingStatus.PENDING, cutoff);

        for (Booking booking : expired) {
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);

            for (BookingSeat bs : booking.getBookingSeats()) {
                bs.setSeatState(SeatState.CANCELLED);
                bookingSeatRepository.save(bs);

                seatService.broadcastSeatUpdate(booking.getShowtime().getId(), bs.getSeat().getId(), SeatState.AVAILABLE);
            }
        }
    }

    private String generateBookingCode() {
        return "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}