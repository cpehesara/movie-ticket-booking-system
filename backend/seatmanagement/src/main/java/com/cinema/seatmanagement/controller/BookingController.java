package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.enums.PaymentMethod;
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

    private final BookingService   bookingService;
    private final PaymentService   paymentService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<BookingResponse> createBooking(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody CreateBookingRequest request
    ) {
        Long userId = extractUserId(authHeader);
        BookingResponse response = bookingService.createBooking(userId, request);

        // Inline payment: if a paymentMethod is provided, process immediately.
        // Converts the String from the DTO to the typed PaymentMethod enum here —
        // at the controller boundary — so service/repo layers never see raw strings.
        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            PaymentMethod method = parsePaymentMethod(request.getPaymentMethod());
            paymentService.processPayment(response.getId(), method);
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
        return ResponseEntity.ok(bookingService.getBookingsByUser(userId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getBookingById(id));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<BookingResponse> cancelBooking(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id
    ) {
        Long userId = extractUserId(authHeader);
        return ResponseEntity.ok(bookingService.cancelBooking(id, userId));
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private Long extractUserId(String authHeader) {
        return jwtTokenProvider.getUserIdFromToken(authHeader.substring(7));
    }

    /**
     * Converts String → PaymentMethod with a meaningful error message.
     * IllegalArgumentException is caught by GlobalExceptionHandler → 400.
     */
    private PaymentMethod parsePaymentMethod(String raw) {
        try {
            return PaymentMethod.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid payment method: '" + raw + "'. Accepted values: CARD, CASH, MOBILE, ONLINE_BANKING, QR_CODE");
        }
    }
}