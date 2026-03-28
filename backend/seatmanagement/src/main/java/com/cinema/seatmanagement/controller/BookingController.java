package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.BookingService;
import com.cinema.seatmanagement.model.service.interfaces.PaymentService;
import com.cinema.seatmanagement.security.JwtTokenProvider;
import com.cinema.seatmanagement.view.dto.request.CreateBookingRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final PaymentService paymentService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<BookingResponse> createBooking(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody CreateBookingRequest request
    ) {
        Long userId = extractUserId(authHeader);
        BookingResponse response = bookingService.createBooking(userId, request);

        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            paymentService.processPayment(response.getId(), request.getPaymentMethod());
            response = bookingService.getBookingById(response.getId());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = extractUserId(authHeader);
        List<BookingResponse> bookings = bookingService.getBookingsByUser(userId);
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable Long id) {
        BookingResponse response = bookingService.getBookingById(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<BookingResponse> cancelBooking(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id
    ) {
        Long userId = extractUserId(authHeader);
        BookingResponse response = bookingService.cancelBooking(id, userId);
        return ResponseEntity.ok(response);
    }

    private Long extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(token);
    }
}