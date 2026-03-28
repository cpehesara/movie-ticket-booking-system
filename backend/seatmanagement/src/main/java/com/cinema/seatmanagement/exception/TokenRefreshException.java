package com.cinema.seatmanagement.exception;

public class TokenRefreshException extends RuntimeException {

    public TokenRefreshException(String message) {
        super(message);
    }
}