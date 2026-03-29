package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.entity.Payment;
import com.cinema.seatmanagement.model.enums.PaymentMethod;
import com.cinema.seatmanagement.model.enums.PaymentStatus;

public interface PaymentService {

    /**
     * Processes payment for a PENDING booking.
     * On success: Booking → CONFIRMED, BookingSeats → BOOKED, LEDs → BLUE.
     *
     * PaymentMethod typed enum replaces the raw String from the original
     * interface — prevents callers from passing arbitrary strings.
     */
    Payment processPayment(Long bookingId, PaymentMethod paymentMethod);

    Payment getPaymentByBookingId(Long bookingId);

    Payment updatePaymentStatus(Long paymentId, PaymentStatus status);

    Payment refundPayment(Long bookingId);
}