package com.cinema.seatmanagement.notification;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Immutable data carrier passed through the Template Method notification pipeline.
 *
 * Rather than passing 10 arguments to each abstract method, a single context
 * object carries everything. Each concrete email service pulls the fields
 * it needs — booking confirmation needs qrCodeBase64; expiry email doesn't.
 *
 * The static factory methods build a context from a Booking entity so that
 * no service has to manually map fields.
 */
@Getter
@Builder(toBuilder = true)
public class NotificationContext {

    // ── Recipient ──────────────────────────────────────────────────────────
    private final String recipientEmail;
    private final String recipientName;

    // ── Booking ────────────────────────────────────────────────────────────
    private final String bookingCode;
    private final String movieTitle;
    private final String cinemaName;
    private final String screenName;
    private final String startTime;
    private final String endTime;
    private final BigDecimal totalAmount;

    // ── Seats ──────────────────────────────────────────────────────────────
    private final List<String> seatLabels;          // e.g. ["B-5", "B-6"]

    // ── Timestamps ────────────────────────────────────────────────────────
    private final LocalDateTime bookedAt;
    private final LocalDateTime checkedInAt;

    // ── QR / Links ────────────────────────────────────────────────────────
    private final String qrCodeBase64;
    private final String bookingUrl;

    // ── Auxiliary ─────────────────────────────────────────────────────────
    private final String cancellationReason;

    // ── Static factories ──────────────────────────────────────────────────

    public static NotificationContext fromBooking(Booking booking) {
        User user = booking.getUser();
        List<String> seats = booking.getBookingSeats().stream()
                .map(bs -> bs.getSeat().getRowLabel() + "-" + bs.getSeat().getColNumber())
                .toList();

        return NotificationContext.builder()
                .recipientEmail(user.getEmail())
                .recipientName(user.getFullName())
                .bookingCode(booking.getBookingCode())
                .movieTitle(booking.getShowtime().getMovie().getTitle())
                .cinemaName(booking.getShowtime().getScreen().getCinema().getName())
                .screenName(booking.getShowtime().getScreen().getName())
                .startTime(booking.getShowtime().getStartTime().toString())
                .endTime(booking.getShowtime().getEndTime().toString())
                .totalAmount(booking.getTotalAmount())
                .seatLabels(seats)
                .bookedAt(booking.getBookedAt())
                .checkedInAt(booking.getCheckedInAt())
                .build();
    }

    public static NotificationContext fromBookingWithReason(Booking booking, String reason) {
        return fromBooking(booking).toBuilder()
                .cancellationReason(reason)
                .build();
    }
}