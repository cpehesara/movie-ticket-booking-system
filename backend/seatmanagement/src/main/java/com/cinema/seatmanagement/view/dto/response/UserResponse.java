package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long    id;
    private String  email;
    private String  fullName;
    private String  role;
    private Boolean isActive;
    private String  phone;
    private Integer loyaltyPoints;  // Added: shown on customer profile page
    private Long    cinemaId;
    private String  cinemaName;
    private String  createdAt;
}