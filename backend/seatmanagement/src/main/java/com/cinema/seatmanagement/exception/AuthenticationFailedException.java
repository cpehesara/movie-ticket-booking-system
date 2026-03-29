// ── AuthenticationFailedException.java ───────────────────────────────────
package com.cinema.seatmanagement.exception;

public class AuthenticationFailedException extends RuntimeException {

    public AuthenticationFailedException(String message) {
        super(message);
    }

    /** Used when wrapping a lower-level cause (e.g. JWT parsing failure) */
    public AuthenticationFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}