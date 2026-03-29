package com.cinema.seatmanagement.model.enums;

public enum BookingStatus {
    PENDING,      // Seats reserved, awaiting payment
    CONFIRMED,    // Payment received, QR issued
    CHECKED_IN,   // Customer scanned QR at kiosk — physically inside
    COMPLETED,    // Show ended, booking archived
    CANCELLED,    // Cancelled by customer or admin
    EXPIRED       // Reservation TTL elapsed without payment
}