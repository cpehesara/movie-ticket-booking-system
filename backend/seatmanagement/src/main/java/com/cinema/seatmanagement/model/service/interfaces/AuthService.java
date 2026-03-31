package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.enums.UserRole;
import com.cinema.seatmanagement.view.dto.request.LoginRequest;
import com.cinema.seatmanagement.view.dto.request.RefreshTokenRequest;
import com.cinema.seatmanagement.view.dto.request.RegisterRequest;
import com.cinema.seatmanagement.view.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String refreshToken);

    /**
     * Registers a staff member (ADMIN / MANAGER / OPERATOR).
     * The role is passed as the enum type so the compiler enforces valid values
     * at the call site rather than discovering invalid strings at runtime.
     */
    AuthResponse registerStaff(RegisterRequest request, UserRole role, Long cinemaId);
}