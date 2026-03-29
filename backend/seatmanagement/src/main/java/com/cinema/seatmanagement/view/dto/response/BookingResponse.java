package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingResponse {

    private Long       id;
    private String     bookingCode;
    private String     status;
    private BigDecimal totalAmount;
    private String     bookedAt;
    private String     expiresAt;      // Added: bookedAt + TTL — frontend countdown timer needs this
    private String     checkedInAt;
    private String     paymentStatus;  // Added: lets frontend show PENDING vs COMPLETED without a second call

    private Long   showtimeId;
    private String movieTitle;
    private String screenName;
    private String cinemaName;
    private String startTime;

    private List<BookedSeatInfo> seats;
    private String               qrCodeBase64;

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
        private Integer ledIndex;   // Added: kiosk UI "go to seat" indicator, hall display highlight
    }
}