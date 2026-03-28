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

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        Long userId = extractUserId(authHeader);
        UserResponse response = userService.getCurrentUser(userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        Long userId = extractUserId(authHeader);
        UserResponse response = userService.updateProfile(userId, request);
        return ResponseEntity.ok(response);
    }

    private Long extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(token);
    }
}