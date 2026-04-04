package com.cinema.seatmanagement.exception;

import com.cinema.seatmanagement.view.dto.response.ErrorResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.OptimisticLockException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import com.cinema.seatmanagement.exception.InvalidQrCodeException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ── Domain exceptions ─────────────────────────────────────────────────

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationFailed(AuthenticationFailedException ex) {
        // Not logged at ERROR — failed logins are expected and high-volume
        log.debug("Authentication failed: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "AUTH_FAILED", ex.getMessage());
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<ErrorResponse> handleTokenRefresh(TokenRefreshException ex) {
        log.debug("Token refresh failed: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "TOKEN_REFRESH_FAILED", ex.getMessage());
    }

    @ExceptionHandler(InvalidQrCodeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidQrCode(InvalidQrCodeException ex) {
        log.warn("Invalid QR code scanned: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_QR_CODE", ex.getMessage());
    }

    @ExceptionHandler(SeatAlreadyBookedException.class)
    public ResponseEntity<ErrorResponse> handleSeatConflict(SeatAlreadyBookedException ex) {
        log.debug("Seat conflict: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "SEAT_CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(InvalidSeatStateTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidTransition(InvalidSeatStateTransitionException ex) {
        log.warn("Invalid seat state transition: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_STATE_TRANSITION", ex.getMessage());
    }

    @ExceptionHandler(BookingExpiredException.class)
    public ResponseEntity<ErrorResponse> handleExpiredBooking(BookingExpiredException ex) {
        log.debug("Expired booking access: {}", ex.getMessage());
        return buildResponse(HttpStatus.GONE, "BOOKING_EXPIRED", ex.getMessage());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex) {
        log.debug("Entity not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    // ── Concurrency exceptions ────────────────────────────────────────────

    @ExceptionHandler(OptimisticLockException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(OptimisticLockException ex) {
        log.warn("Optimistic lock conflict — client should retry: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "CONCURRENT_UPDATE",
                "Another request modified this data simultaneously. Please retry.");
    }

    // ── Security exceptions ───────────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        // Not logged at ERROR — this is expected for probing requests
        log.debug("Access denied: {}", ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, "ACCESS_DENIED",
                "You do not have permission to perform this action.");
    }

    // ── Validation exceptions ─────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        log.info("Validation failed: {}", fieldErrors);

        Map<String, Object> body = new HashMap<>();
        body.put("code",      "VALIDATION_FAILED");
        body.put("message",   "Request validation failed");
        body.put("errors",    fieldErrors);
        body.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Handles bad enum values passed to @RequestParam (e.g. invalid UserRole,
     * invalid SeatState) and the parsePaymentMethod() helper in BookingController.
     * Without this, Spring returns a 500 with an unhelpful stack trace.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.debug("Bad request argument: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_ARGUMENT", ex.getMessage());
    }

    /**
     * Handles domain state violations — e.g. "Cannot cancel a CHECKED_IN booking".
     * These are business rule rejections, not programming errors → 409 Conflict.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        log.warn("Business rule violation: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "INVALID_OPERATION", ex.getMessage());
    }

    /**
     * Handles Spring MVC type conversion failures — e.g. passing "abc" where
     * a Long path variable is expected. Returns a clear message instead of 500.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = "Invalid value '" + ex.getValue() + "' for parameter '" + ex.getName() + "'";
        log.debug("Type mismatch: {}", message);
        return buildResponse(HttpStatus.BAD_REQUEST, "TYPE_MISMATCH", message);
    }

    /**
     * Handles missing required @RequestParam — e.g. calling /api/showtimes without ?movieId.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        String message = "Required parameter '" + ex.getParameterName() + "' is missing";
        return buildResponse(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", message);
    }

    /**
     * Handles missing required @RequestHeader — e.g. calling a secured endpoint
     * without the Authorization header. Returns 400 instead of 500.
     */
    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(MissingRequestHeaderException ex) {
        String message = "Required header '" + ex.getHeaderName() + "' is missing";
        return buildResponse(HttpStatus.BAD_REQUEST, "MISSING_HEADER", message);
    }

    // ── Catch-all ─────────────────────────────────────────────────────────

    /**
     * Last-resort handler — logs at ERROR because reaching here means an
     * unhandled exception type slipped through the domain handlers above.
     * The response intentionally hides the internal message from the client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again later.");
    }

    // ── Shared builder ────────────────────────────────────────────────────

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String code, String message) {
        ErrorResponse error = ErrorResponse.builder()
                .code(code)
                .message(message)
                .timestamp(LocalDateTime.now().toString())
                .build();
        return ResponseEntity.status(status).body(error);
    }
}