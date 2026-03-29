package com.cinema.seatmanagement.model.enums;

/**
 * Typed payment method — replaces the raw String field on Payment.
 * PaymentServiceImpl must pass PaymentMethod.valueOf(method) instead of a raw string.
 *
 * SOLID-O: adding a new channel (e.g. CRYPTO) = add one enum constant,
 * create one new PaymentStrategy implementation. Zero changes to existing code.
 */
public enum PaymentMethod {
    CARD,           // Debit / credit card via POS terminal
    CASH,           // Cash at kiosk — operator confirms manually
    MOBILE,         // Mobile wallet (Apple Pay, Google Pay)
    ONLINE_BANKING, // Internet banking redirect
    QR_CODE         // QR-based payment (e.g. PayHere, iPay)
}