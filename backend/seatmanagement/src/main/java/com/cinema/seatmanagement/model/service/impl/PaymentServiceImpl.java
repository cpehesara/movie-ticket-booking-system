package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Payment;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.PaymentMethod;
import com.cinema.seatmanagement.model.enums.PaymentStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.PaymentRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import com.cinema.seatmanagement.model.service.interfaces.PaymentService;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.notification.BookingConfirmationEmailService;
import com.cinema.seatmanagement.notification.NotificationContext;
import com.cinema.seatmanagement.util.QrCodeGenerator;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository                paymentRepository;
    private final BookingRepository                bookingRepository;
    private final BookingSeatRepository            bookingSeatRepository;
    private final SeatService                      seatService;
    private final AuditLogService                  auditLogService;
    private final BookingConfirmationEmailService  confirmationEmailService;
    private final QrCodeGenerator                  qrCodeGenerator;

    @Override
    @Transactional
    public Payment processPayment(Long bookingId, PaymentMethod paymentMethod) {
        Booking booking = bookingRepository.findWithDetailsById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with id: " + bookingId));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalStateException(
                    "Cannot process payment — booking status is " + booking.getStatus());
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
            // STATE PATTERN — delegates RESERVED → BOOKED validation to SeatStateContext
            SeatStateContext ctx       = SeatStateContext.of(bs.getSeatState());
            SeatState        prevState = bs.getSeatState();
            SeatState        nextState = ctx.book();

            bs.setSeatState(nextState);
            bookingSeatRepository.save(bs);

            seatService.broadcastSeatUpdate(
                    booking.getShowtime().getId(), bs.getSeat().getId(), nextState);

            auditLogService.record(
                    bs.getSeat().getId(), booking.getShowtime().getId(), bookingId,
                    booking.getUser().getId(), "USER",
                    AuditAction.SEAT_BOOKED,
                    prevState, nextState,
                    "Payment confirmed via " + paymentMethod.name()
            );
        }

        auditLogService.record(
                null, booking.getShowtime().getId(), bookingId,
                booking.getUser().getId(), "USER",
                AuditAction.BOOKING_CONFIRMED, null, null,
                "Payment method: " + paymentMethod.name()
                        + " | Ref: " + payment.getTransactionRef()
        );

        // ── Email notification — TEMPLATE METHOD PATTERN ──────────────────
        // Runs @Async on emailTaskExecutor — HTTP response is not blocked.
        // QR code is generated fresh here (same code used in the email body).
        try {
            String qrBase64 = qrCodeGenerator.generateQrCodeBase64(booking.getBookingCode());
            NotificationContext ctx = NotificationContext.fromBooking(booking)
                    .toBuilder()
                    .qrCodeBase64(qrBase64)
                    .build();
            confirmationEmailService.sendNotification(ctx);
        } catch (Exception e) {
            // Email failure must never roll back a successful payment transaction
            log.error("[Email] Failed to send booking confirmation for bookingId={}: {}",
                    bookingId, e.getMessage(), e);
        }

        return payment;
    }

    @Override
    @Transactional(readOnly = true)
    public Payment getPaymentByBookingId(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Payment not found for booking id: " + bookingId));
    }

    @Override
    @Transactional
    public Payment updatePaymentStatus(Long paymentId, PaymentStatus status) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Payment not found with id: " + paymentId));

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
                .orElseThrow(() -> new EntityNotFoundException(
                        "Payment not found for booking id: " + bookingId));

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new IllegalStateException(
                    "Cannot refund a payment with status: " + payment.getStatus());
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        return paymentRepository.save(payment);
    }
}