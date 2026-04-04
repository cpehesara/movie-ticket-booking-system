package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ShowtimeRequest {
    @NotNull
    private Long movieId;
    
    @NotNull
    private Long screenId;
    
    @NotNull
    private LocalDateTime startTime;
    
    @NotNull
    private LocalDateTime endTime;
    
    @NotNull
    private BigDecimal basePrice;
    
    private String status;
}
