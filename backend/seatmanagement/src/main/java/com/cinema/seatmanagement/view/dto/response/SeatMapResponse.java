package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatMapResponse {

    private Long    showtimeId;
    private Long    screenId;
    private String  screenName;
    private Integer rowsCount;
    private Integer colsCount;
    private Integer totalSeats;      // Added: screen.totalSeats — frontend progress bar
    private Integer availableCount;  // Added: count of AVAILABLE seats — frontend "X seats left"
    private List<SeatInfo> seats;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SeatInfo {
        private Long    seatId;
        private String  rowLabel;
        private Integer colNumber;
        private String  seatType;
        private String  seatState;
        private Boolean isActive;
        private Integer ledIndex;   // Added: hall display board highlights correct physical LED
    }
}