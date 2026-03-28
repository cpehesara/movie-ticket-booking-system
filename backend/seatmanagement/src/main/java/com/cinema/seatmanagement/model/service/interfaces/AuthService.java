package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.request.LoginRequest;
import com.cinema.seatmanagement.view.dto.request.RefreshTokenRequest;
import com.cinema.seatmanagement.view.dto.request.RegisterRequest;
import com.cinema.seatmanagement.view.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String refreshToken);

    AuthResponse registerStaff(RegisterRequest request, String role, Long cinemaId);
}