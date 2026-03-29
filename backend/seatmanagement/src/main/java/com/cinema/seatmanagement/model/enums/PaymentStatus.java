package com.cinema.seatmanagement.model.enums;

public enum PaymentStatus {
    PENDING,    // Initiated, awaiting gateway confirmation
    COMPLETED,  // Gateway confirmed — booking moves to CONFIRMED
    FAILED,     // Gateway rejected — seats returned to AVAILABLE
    REFUNDED    // Admin-issued refund after cancellation
}