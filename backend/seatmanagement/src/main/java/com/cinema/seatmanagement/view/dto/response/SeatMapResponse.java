package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatMapResponse {

    private Long showtimeId;
    private Long screenId;
    private String screenName;
    private Integer rowsCount;
    private Integer colsCount;
    private List<SeatInfo> seats;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SeatInfo {
        private Long seatId;
        private String rowLabel;
        private Integer colNumber;
        private String seatType;
        private String seatState;
        private Boolean isActive;
    }
}