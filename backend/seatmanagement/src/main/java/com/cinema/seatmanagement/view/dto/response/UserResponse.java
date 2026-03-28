package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;
    private String email;
    private String fullName;
    private String role;
    private Boolean isActive;
    private String phone;
    private Long cinemaId;
    private String cinemaName;
    private String createdAt;
}