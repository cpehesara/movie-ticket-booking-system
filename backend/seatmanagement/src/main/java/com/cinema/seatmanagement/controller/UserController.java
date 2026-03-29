package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.UserService;
import com.cinema.seatmanagement.security.JwtTokenProvider;
import com.cinema.seatmanagement.view.dto.request.UpdateProfileRequest;
import com.cinema.seatmanagement.view.dto.response.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService      userService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getCurrentUser(
            @RequestHeader("Authorization") String authHeader
    ) {
        return ResponseEntity.ok(userService.getCurrentUser(extractUserId(authHeader)));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(userService.updateProfile(extractUserId(authHeader), request));
    }

    /**
     * Strips "Bearer " prefix with substring(7) — consistent with all other
     * controllers. The original used authHeader.replace("Bearer ", "") which
     * would corrupt tokens that happen to contain that substring elsewhere.
     */
    private Long extractUserId(String authHeader) {
        return jwtTokenProvider.getUserIdFromToken(authHeader.substring(7));
    }
}