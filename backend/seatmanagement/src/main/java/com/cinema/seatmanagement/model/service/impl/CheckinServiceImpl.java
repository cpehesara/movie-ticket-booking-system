package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.BookingExpiredException;
import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.service.interfaces.CheckinService;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.view.dto.request.CheckinRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CheckinServiceImpl implements CheckinService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingMapper bookingMapper;
    private final SeatService seatService;

    @Override
    @Transactional
    public BookingResponse checkin(CheckinRequest request) {
        Booking booking = bookingRepository.findByBookingCode(request.getBookingCode())
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with code: " + request.getBookingCode()));

        if (booking.getStatus() == BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Booking has already been checked in");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BookingExpiredException("Booking has been " + booking.getStatus().name().toLowerCase());
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Booking must be confirmed before check-in. Current status: " + booking.getStatus());
        }

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        bookingRepository.save(booking);

        for (BookingSeat bs : booking.getBookingSeats()) {
            bs.setSeatState(SeatState.OCCUPIED);
            bookingSeatRepository.save(bs);

            seatService.broadcastSeatUpdate(booking.getShowtime().getId(), bs.getSeat().getId(), SeatState.OCCUPIED);
        }

        return bookingMapper.toResponse(booking);
    }
}