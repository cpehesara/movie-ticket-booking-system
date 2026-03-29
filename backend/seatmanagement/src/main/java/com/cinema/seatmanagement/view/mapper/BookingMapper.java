package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class BookingMapper {

    @Value("${booking.reservation-ttl-minutes:7}")
    private int reservationTtlMinutes;

    public BookingResponse toResponse(Booking booking) {
        List<BookingResponse.BookedSeatInfo> seatInfos = booking.getBookingSeats().stream()
                .map(this::toBookedSeatInfo)
                .collect(Collectors.toList());

        // expiresAt: only meaningful while PENDING — null for all other statuses.
        // Frontend countdown timer reads this to show "Expires in 4:32".
        String expiresAt = null;
        if (booking.getBookedAt() != null) {
            LocalDateTime expiry = booking.getBookedAt().plusMinutes(reservationTtlMinutes);
            expiresAt = expiry.toString();
        }

        // paymentStatus: pulled from the Payment relation — null if payment not yet created.
        String paymentStatus = (booking.getPayment() != null)
                ? booking.getPayment().getStatus().name()
                : null;

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .status(booking.getStatus().name())
                .totalAmount(booking.getTotalAmount())
                .bookedAt(booking.getBookedAt() != null ? booking.getBookedAt().toString() : null)
                .expiresAt(expiresAt)
                .checkedInAt(booking.getCheckedInAt() != null ? booking.getCheckedInAt().toString() : null)
                .paymentStatus(paymentStatus)
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
                .ledIndex(bookingSeat.getSeat().getLedIndex())   // null if no LED mapped
                .build();
    }
}