package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckinRequest {

    @NotBlank(message = "Booking code is required")
    private String bookingCode;
}