package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * BookingResponse — DTO returned for all booking-related endpoints.
 *
 * BookedSeatInfo now includes ledIndex so the frontend (BookingHistoryPage,
 * CheckinPage) can display which physical LED corresponds to each booked seat.
 * This is purely informational for the customer — the actual LED is controlled
 * by the MQTT command from MqttPublisher, not by the frontend.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingResponse {

    private Long id;
    private String bookingCode;
    private String status;
    private BigDecimal totalAmount;
    private String bookedAt;
    private String checkedInAt;

    private Long showtimeId;
    private String movieTitle;
    private String screenName;
    private String cinemaName;
    private String startTime;

    /** Base64-encoded PNG QR code — present only on createBooking response. */
    private String qrCodeBase64;

    private List<BookedSeatInfo> seats;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookedSeatInfo {
        private Long    seatId;
        private String  rowLabel;
        private Integer colNumber;
        private String  seatType;
        private String  seatState;

        /**
         * Physical LED index for this seat (matches led_index in the seat table).
         * Null if the seat has no associated LED (e.g. Hall B without IoT hardware).
         */
        private Integer ledIndex;
    }
}