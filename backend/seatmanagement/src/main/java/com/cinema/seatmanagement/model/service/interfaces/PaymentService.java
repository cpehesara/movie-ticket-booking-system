package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.entity.Payment;
import com.cinema.seatmanagement.model.enums.PaymentStatus;

public interface PaymentService {

    Payment processPayment(Long bookingId, String paymentMethod);

    Payment getPaymentByBookingId(Long bookingId);

    Payment updatePaymentStatus(Long paymentId, PaymentStatus status);

    Payment refundPayment(Long bookingId);
}