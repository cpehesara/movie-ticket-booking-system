package com.cinema.seatmanagement.exception;

/**
 * Thrown when a QR code payload fails HMAC validation, has wrong format,
 * or references an entity that no longer exists.
 *
 * Mapped to HTTP 400 Bad Request by GlobalExceptionHandler.
 */
public class InvalidQrCodeException extends RuntimeException {

    public InvalidQrCodeException(String message) {
        super(message);
    }

    public InvalidQrCodeException(String message, Throwable cause) {
        super(message, cause);
    }
}