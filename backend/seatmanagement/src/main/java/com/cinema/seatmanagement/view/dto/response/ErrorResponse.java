package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {

    private String code;
    private String message;
    private String timestamp;
}