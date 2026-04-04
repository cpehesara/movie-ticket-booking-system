package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * BookingMapper — converts Booking entities to BookingResponse DTOs.
 *
 * CHANGE: BookedSeatInfo now includes ledIndex from the Seat entity.
 * This lets the frontend show "Your LED is #3" style messaging on the
 * booking history page, giving customers a hint about the physical indicator.
 */
@Component
public class BookingMapper {

    public BookingResponse toResponse(Booking booking) {
        List<BookingResponse.BookedSeatInfo> seatInfos = booking.getBookingSeats().stream()
                .map(this::toBookedSeatInfo)
                .collect(Collectors.toList());

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .status(booking.getStatus().name())
                .totalAmount(booking.getTotalAmount())
                .bookedAt(booking.getBookedAt() != null
                        ? booking.getBookedAt().toString() : null)
                .checkedInAt(booking.getCheckedInAt() != null
                        ? booking.getCheckedInAt().toString() : null)
                .showtimeId(booking.getShowtime().getId())
                .movieTitle(booking.getShowtime().getMovie().getTitle())
                .screenName(booking.getShowtime().getScreen().getName())
                .cinemaName(booking.getShowtime().getScreen().getCinema().getName())
                .startTime(booking.getShowtime().getStartTime().toString())
                .seats(seatInfos)
                .build();
    }

    public BookingResponse toResponseWithQr(Booking booking, String qrCodeBase64) {
        BookingResponse response = toResponse(booking);
        response.setQrCodeBase64(qrCodeBase64);
        return response;
    }

    private BookingResponse.BookedSeatInfo toBookedSeatInfo(BookingSeat bookingSeat) {
        return BookingResponse.BookedSeatInfo.builder()
                .seatId(bookingSeat.getSeat().getId())
                .rowLabel(bookingSeat.getSeat().getRowLabel())
                .colNumber(bookingSeat.getSeat().getColNumber())
                .seatType(bookingSeat.getSeat().getSeatType().name())
                .seatState(bookingSeat.getSeatState().name())
                .ledIndex(bookingSeat.getSeat().getLedIndex())   // ← new
                .build();
    }
}