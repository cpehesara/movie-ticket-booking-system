package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBookingRequest {

    @NotNull(message = "Showtime ID is required")
    private Long showtimeId;

    @NotEmpty(message = "At least one seat must be selected")
    @Size(max = 10, message = "Cannot book more than 10 seats in a single transaction")
    private List<Long> seatIds;

    /**
     * Kept as String at the DTO boundary — BookingController.parsePaymentMethod()
     * converts it to the PaymentMethod enum before passing to the service.
     * Keeping it String here means the DTO stays decoupled from the enum
     * and a bad value produces a descriptive 400 rather than a deserialization error.
     */
    private String paymentMethod;
}