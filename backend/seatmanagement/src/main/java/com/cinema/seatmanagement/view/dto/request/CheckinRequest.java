package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckinRequest {

    @NotBlank(message = "Booking code is required")
    @Size(min = 5, max = 20, message = "Booking code must be between 5 and 20 characters")
    @Pattern(regexp = "^BK-[A-Z0-9]{8}$", message = "Invalid booking code format")
    private String bookingCode;
}