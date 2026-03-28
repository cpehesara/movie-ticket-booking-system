package com.cinema.seatmanagement.exception;

public class InvalidSeatStateTransitionException extends RuntimeException {

    public InvalidSeatStateTransitionException(String message) {
        super(message);
    }
}