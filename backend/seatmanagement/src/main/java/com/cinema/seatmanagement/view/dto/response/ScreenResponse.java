package com.cinema.seatmanagement.view.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreenResponse {
    private Long id;
    private String name;
    private Integer totalSeats;
}