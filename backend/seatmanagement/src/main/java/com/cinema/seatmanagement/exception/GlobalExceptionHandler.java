package com.cinema.seatmanagement.exception;

import com.cinema.seatmanagement.view.dto.response.ErrorResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.OptimisticLockException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationFailed(AuthenticationFailedException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "AUTH_FAILED", ex.getMessage());
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<ErrorResponse> handleTokenRefresh(TokenRefreshException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "TOKEN_REFRESH_FAILED", ex.getMessage());
    }

    @ExceptionHandler(SeatAlreadyBookedException.class)
    public ResponseEntity<ErrorResponse> handleSeatConflict(SeatAlreadyBookedException ex) {
        return buildResponse(HttpStatus.CONFLICT, "SEAT_CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(InvalidSeatStateTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidTransition(InvalidSeatStateTransitionException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_STATE_TRANSITION", ex.getMessage());
    }

    @ExceptionHandler(BookingExpiredException.class)
    public ResponseEntity<ErrorResponse> handleExpiredBooking(BookingExpiredException ex) {
        return buildResponse(HttpStatus.GONE, "BOOKING_EXPIRED", ex.getMessage());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(OptimisticLockException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(OptimisticLockException ex) {
        return buildResponse(HttpStatus.CONFLICT, "CONCURRENT_UPDATE", "Data was modified by another request. Please retry.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "You do not have permission to perform this action.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("code", "VALIDATION_FAILED");
        body.put("message", "Request validation failed");
        body.put("errors", fieldErrors);
        body.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred.");
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String code, String message) {
        ErrorResponse error = ErrorResponse.builder()
                .code(code)
                .message(message)
                .timestamp(LocalDateTime.now().toString())
                .build();
        return ResponseEntity.status(status).body(error);
    }
}