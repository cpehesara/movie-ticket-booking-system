package com.cinema.seatmanagement.view.dto.request;

import com.cinema.seatmanagement.model.enums.SeatState;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatStateUpdateRequest {

    @NotNull(message = "Showtime ID is required")
    private Long showtimeId;

    @NotNull(message = "New seat state is required")
    private SeatState newState;
}