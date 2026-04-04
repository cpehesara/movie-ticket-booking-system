package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.service.interfaces.BookingService;
import com.cinema.seatmanagement.model.service.interfaces.PaymentService;
import com.cinema.seatmanagement.security.JwtTokenProvider;
import com.cinema.seatmanagement.util.QrCodeGenerator;
import com.cinema.seatmanagement.view.dto.request.CreateBookingRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.model.enums.PaymentMethod;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * BookingController — customer-facing booking endpoints.
 *
 * CHANGE: getBookingById() now includes the QR code in the response when the
 * booking status is CONFIRMED or CHECKED_IN. This allows BookingHistoryPage
 * to retrieve the QR on demand without storing it in the frontend state.
 *
 * WHY NOT ALWAYS INCLUDE QR:
 *   Generating a QR image is CPU-expensive. The list endpoint (getMyBookings)
 *   returns potentially many bookings — attaching a 300×300 PNG to each would
 *   waste significant bandwidth. Single-booking fetch is cheap.
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final PaymentService paymentService;
    private final JwtTokenProvider jwtTokenProvider;
    private final QrCodeGenerator qrCodeGenerator;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<BookingResponse> createBooking(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody CreateBookingRequest request
    ) {
        Long userId = extractUserId(authHeader);
        BookingResponse response = bookingService.createBooking(userId, request);

        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            paymentService.processPayment(response.getId(), PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase()));
            // Re-fetch after payment so status = CONFIRMED and QR is included
            // BookingServiceImpl.getBookingById now handles the QR code generation internally
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

    /**
     * Single booking fetch — includes QR code if booking is still active.
     * Active = CONFIRMED or CHECKED_IN (customer may still need to scan).
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable Long id) {
        // BookingServiceImpl now naturally attaches the QR code to the DTO
        // during getBookingById mapping.
        BookingResponse response = bookingService.getBookingById(id);

        // If the booking is not active, clear the qrCodeBase64
        if (!"CONFIRMED".equals(response.getStatus())
                && !"CHECKED_IN".equals(response.getStatus())) {
            response.setQrCodeBase64(null);
        }

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