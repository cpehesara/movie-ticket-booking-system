package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Payment;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.PaymentStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.PaymentRepository;
import com.cinema.seatmanagement.model.service.interfaces.PaymentService;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatService seatService;

    @Override
    @Transactional
    public Payment processPayment(Long bookingId, String paymentMethod) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with id: " + bookingId));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalStateException("Booking is not in PENDING state");
        }

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(booking.getTotalAmount())
                .paymentMethod(paymentMethod)
                .transactionRef("TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .status(PaymentStatus.COMPLETED)
                .paidAt(LocalDateTime.now())
                .build();
        payment = paymentRepository.save(payment);

        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);

        for (BookingSeat bs : booking.getBookingSeats()) {
            bs.setSeatState(SeatState.BOOKED);
            bookingSeatRepository.save(bs);

            seatService.broadcastSeatUpdate(booking.getShowtime().getId(), bs.getSeat().getId(), SeatState.BOOKED);
        }

        return payment;
    }

    @Override
    @Transactional(readOnly = true)
    public Payment getPaymentByBookingId(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found for booking id: " + bookingId));
    }

    @Override
    @Transactional
    public Payment updatePaymentStatus(Long paymentId, PaymentStatus status) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found with id: " + paymentId));

        payment.setStatus(status);
        if (status == PaymentStatus.COMPLETED) {
            payment.setPaidAt(LocalDateTime.now());
        }
        return paymentRepository.save(payment);
    }

    @Override
    @Transactional
    public Payment refundPayment(Long bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found for booking id: " + bookingId));

        payment.setStatus(PaymentStatus.REFUNDED);
        return paymentRepository.save(payment);
    }
}