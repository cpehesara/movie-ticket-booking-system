package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShowtimeResponse {

    private Long id;
    private Long movieId;
    private String movieTitle;
    private Long screenId;
    private String screenName;
    private String cinemaName;
    private String startTime;
    private String endTime;
    private BigDecimal basePrice;
    private String status;
    private Integer availableSeats;
    private Integer totalSeats;
}