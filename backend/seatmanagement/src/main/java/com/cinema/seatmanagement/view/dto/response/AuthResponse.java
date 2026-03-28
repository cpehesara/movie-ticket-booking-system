package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String role;
    private String fullName;
    private String email;
    private Long userId;
}